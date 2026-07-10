import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

const PASSWORD = 'Password123!';
const FREE_SCANS_PER_DAY = parseInt(process.env.FREE_SCANS_PER_DAY) || 3;

async function createFreeTierUser(email) {
  // Fresh users default to subscription.status: 'trialing', which User.isPremium()
  // treats as premium for the trial window — force a lapsed/canceled subscription
  // so req.tier resolves to 'free' and the daily scan cap actually applies.
  return User.create({
    email,
    password: PASSWORD,
    name: 'Free Tier User',
    emailVerified: true,
    subscription: { status: 'canceled', plan: 'free' },
  });
}

describe('free tier daily scan limit', () => {
  it(`allows exactly ${FREE_SCANS_PER_DAY} scans per day then returns 429 on the next attempt`, async () => {
    const user = await createFreeTierUser('freetier@example.com');

    const loginRes = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken;

    const websiteRes = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', nickname: 'Rate Limit Target' });
    expect(websiteRes.status).toBe(201);
    const websiteId = websiteRes.body.data.website._id;

    for (let i = 0; i < FREE_SCANS_PER_DAY; i++) {
      const res = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ websiteId, type: 'baseline' });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('queued');
    }

    const overLimitRes = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${token}`)
      .send({ websiteId, type: 'baseline' });
    expect(overLimitRes.status).toBe(429);
    expect(overLimitRes.body.success).toBe(false);
    expect(overLimitRes.body.code).toBe('RATE_LIMITED');
  });

  it('scopes the daily limit per website, not globally per user', async () => {
    const user = await createFreeTierUser('freetier2@example.com');
    const loginRes = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const token = loginRes.body.data.accessToken;

    const siteA = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', nickname: 'Site A' });
    const siteB = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.org', nickname: 'Site B' });

    const websiteIdA = siteA.body.data.website._id;
    const websiteIdB = siteB.body.data.website._id;

    for (let i = 0; i < FREE_SCANS_PER_DAY; i++) {
      const res = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ websiteId: websiteIdA, type: 'baseline' });
      expect(res.status).toBe(201);
    }

    // Site A is now exhausted for the day...
    const exhaustedA = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${token}`)
      .send({ websiteId: websiteIdA, type: 'baseline' });
    expect(exhaustedA.status).toBe(429);

    // ...but Site B has its own independent quota.
    const stillOkB = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${token}`)
      .send({ websiteId: websiteIdB, type: 'baseline' });
    expect(stillOkB.status).toBe(201);
  });
});
