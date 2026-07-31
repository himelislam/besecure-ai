import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Report from '../models/Report.js';
import { createFreeTierUser, createPremiumUser, createWebsiteDirect, createScanDirect, authHeader } from './helpers.js';

describe('report generation limits', () => {
  it('a free-tier "generating" report blocks a second attempt with 403 PLAN_LIMIT_REACHED', async () => {
    const user = await createFreeTierUser('reportgenerating@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    const firstRes = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.data.status).toBe('generating');

    const secondRes = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(secondRes.status).toBe(403);
    expect(secondRes.body.code).toBe('PLAN_LIMIT_REACHED');

    const count = await Report.countDocuments({ scanId: scan._id });
    expect(count).toBe(1); // the blocked attempt never created a second document
  });

  it('a "failed" report does NOT count against the free-tier limit — a retry is allowed', async () => {
    const user = await createFreeTierUser('reportfailed@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    await Report.create({ userId: user._id, scanId: scan._id, websiteId: website._id, status: 'failed', error: 'PDF render crashed' });

    const retryRes = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.data.status).toBe('generating');

    const count = await Report.countDocuments({ scanId: scan._id });
    expect(count).toBe(2); // the failed one, plus this new retry — not blocked, not overwritten
  });

  it('a "completed" report is returned as a cached 200, not a 403 — it never reaches the plan-limit check at all', async () => {
    const user = await createFreeTierUser('reportcompleted@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    const completed = await Report.create({
      userId: user._id,
      scanId: scan._id,
      websiteId: website._id,
      status: 'completed',
      cloudinaryUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/reports/fake',
      generatedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));

    expect(res.status).toBe(200); // not 201 (nothing new generated), not 403 (not blocked)
    expect(res.body.data.reportId).toBe(completed._id.toString());
    expect(res.body.data.status).toBe('completed');

    const count = await Report.countDocuments({ scanId: scan._id });
    expect(count).toBe(1); // no duplicate created
  });

  it('a premium user is not subject to the one-active-report-per-scan limit', async () => {
    const user = await createPremiumUser('reportpremium@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    const firstRes = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app)
      .post(`/api/reports/${scan._id}`)
      .set('Authorization', authHeader(user));
    // Premium skips the free-tier activeCount check entirely — a second
    // "generating" report is allowed to be created.
    expect(secondRes.status).toBe(201);

    const count = await Report.countDocuments({ scanId: scan._id });
    expect(count).toBe(2);
  });
});
