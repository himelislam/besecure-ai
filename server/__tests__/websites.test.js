import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../services/verification/dnsVerifier.js', () => ({ verifyDns: vi.fn() }));
vi.mock('../services/verification/metaTagVerifier.js', () => ({ verifyMetaTag: vi.fn() }));

import app from '../app.js';
import Website from '../models/Website.js';
import { verifyDns } from '../services/verification/dnsVerifier.js';
import { verifyMetaTag } from '../services/verification/metaTagVerifier.js';
import { createVerifiedUser, createFreeTierUser, authHeader } from './helpers.js';

beforeEach(() => {
  verifyDns.mockReset();
  verifyMetaTag.mockReset();
});

describe('websites', () => {
  it('creates a website and returns real verification instructions', async () => {
    const user = await createVerifiedUser('websiteowner@example.com');

    const res = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'My Site' });

    expect(res.status).toBe(201);
    expect(res.body.data.website.verified).toBe(false);
    expect(res.body.data.website.domain).toBe('example.com');

    const token = res.body.data.website.verificationToken;
    expect(res.body.data.verificationInstructions).toEqual({
      token,
      dns: { type: 'TXT', host: '_security-audit-verify.example.com', value: token },
      metaTag: {
        tag: `<meta name="security-audit-verify" content="${token}">`,
        placement: 'Add inside the <head> element of your homepage',
      },
    });

    // GET .../verify returns the identical instructions independently.
    const instrRes = await request(app)
      .get(`/api/websites/${res.body.data.website._id}/verify`)
      .set('Authorization', authHeader(user));
    expect(instrRes.status).toBe(200);
    expect(instrRes.body.data).toEqual(res.body.data.verificationInstructions);
  });

  it('reports verified:false with no matching DNS/meta tag (mismatch case)', async () => {
    const user = await createVerifiedUser('mismatch@example.com');
    const createRes = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'Mismatch Site' });
    const websiteId = createRes.body.data.website._id;

    verifyDns.mockResolvedValue({ verified: false, record: null });
    verifyMetaTag.mockResolvedValue({ verified: false, content: null });

    const verifyRes = await request(app)
      .post(`/api/websites/${websiteId}/verify`)
      .set('Authorization', authHeader(user));

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(false);
    expect(verifyRes.body.data.message).toMatch(/no matching/i);

    const stored = await Website.findById(websiteId);
    expect(stored.verified).toBe(false);
    expect(stored.verificationAttempts).toBe(1);
    expect(stored.lastVerificationAttempt).toBeTruthy();
  });

  it('verifies via DNS TXT match and persists the method/timestamp', async () => {
    const user = await createVerifiedUser('dnsmatch@example.com');
    const createRes = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'DNS Match Site' });
    const websiteId = createRes.body.data.website._id;
    const token = createRes.body.data.website.verificationToken;

    verifyDns.mockResolvedValue({ verified: true, record: token });
    verifyMetaTag.mockResolvedValue({ verified: false, content: null });

    const verifyRes = await request(app)
      .post(`/api/websites/${websiteId}/verify`)
      .set('Authorization', authHeader(user));

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);
    expect(verifyRes.body.data.message).toMatch(/DNS TXT record/);

    const stored = await Website.findById(websiteId);
    expect(stored.verified).toBe(true);
    expect(stored.verificationMethod).toBe('dns');
    expect(stored.verifiedAt).toBeTruthy();
  });

  it('verifies via meta tag match when DNS does not match', async () => {
    const user = await createVerifiedUser('metamatch@example.com');
    const createRes = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'Meta Match Site' });
    const websiteId = createRes.body.data.website._id;
    const token = createRes.body.data.website.verificationToken;

    verifyDns.mockResolvedValue({ verified: false, record: null });
    verifyMetaTag.mockResolvedValue({ verified: true, content: token });

    const verifyRes = await request(app)
      .post(`/api/websites/${websiteId}/verify`)
      .set('Authorization', authHeader(user));

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);
    expect(verifyRes.body.data.message).toMatch(/meta tag/i);

    const stored = await Website.findById(websiteId);
    expect(stored.verificationMethod).toBe('meta_tag');
  });

  it('rejects a duplicate domain for the same user with 409 DUPLICATE_KEY', async () => {
    const user = await createVerifiedUser('duplicate@example.com');

    const first = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'First' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com/some/path', nickname: 'Second, same domain' });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('DUPLICATE_KEY');

    const count = await Website.countDocuments({ userId: user._id, domain: 'example.com' });
    expect(count).toBe(1);
  });

  it('blocks a 4th website on the free tier with 403 PLAN_LIMIT_REACHED', async () => {
    const user = await createFreeTierUser('quota@example.com');
    const domains = ['one.example.com', 'two.example.com', 'three.example.com'];

    for (const domain of domains) {
      const res = await request(app)
        .post('/api/websites')
        .set('Authorization', authHeader(user))
        .send({ url: `https://${domain}`, nickname: domain });
      expect(res.status).toBe(201);
    }

    const fourth = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://four.example.com', nickname: 'four.example.com' });

    expect(fourth.status).toBe(403);
    expect(fourth.body.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('soft-delete removes a website from the list — and, per the real ownership-check pattern, also 404s by direct ID (not just not-yours/not-found, identically)', async () => {
    const user = await createVerifiedUser('softdelete@example.com');
    const createRes = await request(app)
      .post('/api/websites')
      .set('Authorization', authHeader(user))
      .send({ url: 'https://example.com', nickname: 'To Delete' });
    const websiteId = createRes.body.data.website._id;

    const deleteRes = await request(app)
      .delete(`/api/websites/${websiteId}`)
      .set('Authorization', authHeader(user));
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app).get('/api/websites').set('Authorization', authHeader(user));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.websites.find((w) => w._id === websiteId)).toBeUndefined();
    expect(listRes.body.data.total).toBe(0);

    // getWebsite filters isDeleted:false identically to the ownership check —
    // a soft-deleted website is NOT fetchable by ID either, on purpose (see
    // CLAUDE.md rule 5 / websiteController.js's getWebsite): "not found",
    // "not yours", and "soft-deleted" are all the same 404, indistinguishable
    // from the outside. Confirmed directly against the DB below too.
    const getRes = await request(app)
      .get(`/api/websites/${websiteId}`)
      .set('Authorization', authHeader(user));
    expect(getRes.status).toBe(404);
    expect(getRes.body.code).toBe('NOT_FOUND');

    const stored = await Website.findById(websiteId);
    expect(stored.isDeleted).toBe(true);
    expect(stored.deletedAt).toBeTruthy();
  });
});
