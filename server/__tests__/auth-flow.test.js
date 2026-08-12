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

describe('auth flow: register -> login -> refresh -> change-password', () => {
  it('walks the full real lifecycle end to end', async () => {
    const email = 'lifecycle@example.com';

    // 1. Register — 201, account is already verified, no tokens issued yet.
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Lifecycle User', email, password: PASSWORD });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.user.email).toBe(email);

    const userAfterRegister = await User.findOne({ email });
    expect(userAfterRegister.emailVerified).toBe(true);

    // 2. Login — identical error/code for wrong password and a nonexistent
    // email; never lets a caller distinguish which.
    const wrongPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123!' });
    expect(wrongPasswordRes.status).toBe(401);
    expect(wrongPasswordRes.body.code).toBe('UNAUTHORIZED');
    const invalidCredentialsMessage = wrongPasswordRes.body.error;

    const nonexistentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-such-user@example.com', password: PASSWORD });
    expect(nonexistentRes.status).toBe(401);
    expect(nonexistentRes.body.code).toBe('UNAUTHORIZED');
    expect(nonexistentRes.body.error).toBe(invalidCredentialsMessage);

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
