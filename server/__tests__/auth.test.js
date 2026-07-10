import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

const PASSWORD = 'Password123!';

async function createVerifiedUser(email, name) {
  return User.create({ email, password: PASSWORD, name, emailVerified: true });
}

async function login(email, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

describe('ownership checks', () => {
  it("returns 404 when user A requests user B's website (not 403, not leaked)", async () => {
    const userA = await createVerifiedUser('usera@example.com', 'User A');
    await createVerifiedUser('userb@example.com', 'User B');

    const loginA = await login(userA.email);
    expect(loginA.status).toBe(200);
    const tokenA = loginA.body.data.accessToken;

    const loginB = await login('userb@example.com');
    expect(loginB.status).toBe(200);
    const tokenB = loginB.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com', nickname: "User A's site" });
    expect(createRes.status).toBe(201);
    const websiteId = createRes.body.data.website._id;

    // Owner can read their own resource.
    const getOwn = await request(app)
      .get(`/api/websites/${websiteId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getOwn.status).toBe(200);
    expect(getOwn.body.data.website._id).toBe(websiteId);

    // A different authenticated user gets 404, not 403 — existence isn't leaked.
    const getOther = await request(app)
      .get(`/api/websites/${websiteId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(getOther.status).toBe(404);
    expect(getOther.body.success).toBe(false);
    expect(getOther.body.code).toBe('NOT_FOUND');

    // Same 404 for update and delete — the ownership check is uniform across the controller.
    const patchOther = await request(app)
      .patch(`/api/websites/${websiteId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ nickname: 'Hijacked' });
    expect(patchOther.status).toBe(404);

    const deleteOther = await request(app)
      .delete(`/api/websites/${websiteId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(deleteOther.status).toBe(404);

    // The website must survive untouched for its real owner.
    const getStillOwn = await request(app)
      .get(`/api/websites/${websiteId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getStillOwn.status).toBe(200);
    expect(getStillOwn.body.data.website.nickname).toBe("User A's site");
  });

  it('returns a generic 404 for a well-formed id that belongs to no one', async () => {
    const user = await createVerifiedUser('usernoresource@example.com', 'No Resource');
    const loginRes = await login(user.email);
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/websites/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('authentication', () => {
  it('rejects requests with no access token', async () => {
    const res = await request(app).get('/api/websites');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects requests with an invalid access token', async () => {
    const res = await request(app).get('/api/websites').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('never returns the password hash on login', async () => {
    const user = await createVerifiedUser('userpw@example.com', 'Password Check');
    const res = await login(user.email);
    expect(res.status).toBe(200);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBeUndefined();
  });
});
