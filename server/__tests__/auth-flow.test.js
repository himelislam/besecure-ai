import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { PASSWORD } from './helpers.js';

// Extracts just the refreshToken cookie's `name=value` pair from a
// Set-Cookie header array, discarding attributes (HttpOnly, Path, etc.) so
// it can be replayed via .set('Cookie', ...) on a later request.
function extractRefreshCookie(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const raw = setCookie.find((c) => c.startsWith('refreshToken='));
  return raw ? raw.split(';')[0] : null;
}

describe('auth flow: register -> verify -> login -> refresh -> change-password', () => {
  it('walks the full real lifecycle end to end', async () => {
    const email = 'lifecycle@example.com';

    // 1. Register — 201, message only, no tokens issued yet.
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Lifecycle User', email, password: PASSWORD });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data).toBeUndefined();

    const userAfterRegister = await User.findOne({ email }).select('+emailVerificationToken');
    expect(userAfterRegister.emailVerified).toBe(false);
    expect(userAfterRegister.emailVerificationToken).toBeTruthy();
    const verifyToken = userAfterRegister.emailVerificationToken;

    // Login before verification fails with the same generic message as any
    // other invalid-credentials case — never reveals "unverified" specifically.
    const loginUnverified = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(loginUnverified.status).toBe(401);
    expect(loginUnverified.body.code).toBe('UNAUTHORIZED');
    const unverifiedMessage = loginUnverified.body.error;

    // 2. Verify email — 200, flips emailVerified, clears the token (single-use).
    const verifyRes = await request(app).get('/api/auth/verify-email').query({ token: verifyToken });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const userAfterVerify = await User.findOne({ email }).select('+emailVerificationToken');
    expect(userAfterVerify.emailVerified).toBe(true);
    expect(userAfterVerify.emailVerificationToken).toBeNull();

    // Replaying the exact same token a second time now 400s — it no longer
    // matches any user's emailVerificationToken (already cleared).
    const secondVerifyRes = await request(app).get('/api/auth/verify-email').query({ token: verifyToken });
    expect(secondVerifyRes.status).toBe(400);
    expect(secondVerifyRes.body.code).toBe('INVALID_TOKEN');

    // 3. Login — identical error/code for wrong password, unverified email,
    // and a nonexistent email; never lets a caller distinguish which.
    const wrongPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123!' });
    expect(wrongPasswordRes.status).toBe(401);
    expect(wrongPasswordRes.body.code).toBe('UNAUTHORIZED');
    expect(wrongPasswordRes.body.error).toBe(unverifiedMessage);

    const nonexistentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-such-user@example.com', password: PASSWORD });
    expect(nonexistentRes.status).toBe(401);
    expect(nonexistentRes.body.code).toBe('UNAUTHORIZED');
    expect(nonexistentRes.body.error).toBe(unverifiedMessage);

    const loginRes = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();
    expect(loginRes.body.data.user.email).toBe(email);
    expect(loginRes.body.data.user.password).toBeUndefined();

    const oldRefreshCookie = extractRefreshCookie(loginRes);
    expect(oldRefreshCookie).toBeTruthy();

    // 4. Refresh — the cookie from login mints a new access token.
    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', oldRefreshCookie).send();
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    // Not asserting this token differs from login's: JWT `iat` is
    // second-precision and the access token payload is just {userId} with
    // no jti, so a login immediately followed by a refresh within the same
    // second legitimately mints byte-identical tokens. The contract under
    // test is "refresh yields a working access token," not token novelty.

    // 5. Change password — requires the still-valid access token.
    const changePasswordRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ currentPassword: PASSWORD, newPassword: 'NewPassword456!' });
    expect(changePasswordRes.status).toBe(200);

    // 6. The refresh token issued before the password change must now be
    // rejected — changePassword bumps tokenVersion specifically to invalidate it.
    const staleRefreshRes = await request(app).post('/api/auth/refresh').set('Cookie', oldRefreshCookie).send();
    expect(staleRefreshRes.status).toBe(401);
    expect(staleRefreshRes.body.code).toBe('UNAUTHORIZED');

    // The old password no longer works; the new one does.
    const loginOldPassword = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(loginOldPassword.status).toBe(401);

    const loginNewPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'NewPassword456!' });
    expect(loginNewPassword.status).toBe(200);
  });
});
