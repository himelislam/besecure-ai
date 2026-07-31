import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedUser, createWebsiteDirect, createScanDirect, createVulnerabilityDirect, authHeader } from './helpers.js';

describe('dashboard summary', () => {
  it('computes averageScore from each website\'s latest scan only, and openVulnerabilities/riskDistribution from open-status vulnerabilities only', async () => {
    const user = await createVerifiedUser('dashboarduser@example.com');

    const siteA = await createWebsiteDirect(user, { domain: 'a.example.com', url: 'https://a.example.com', nickname: 'Site A' });
    const siteB = await createWebsiteDirect(user, { domain: 'b.example.com', url: 'https://b.example.com', nickname: 'Site B' });

    // Site A: an older completed scan (score 80) then a newer one (score 90)
    // — averageScore must use only the latest (90), not an average of both.
    await createScanDirect(user, siteA, { score: 80, grade: 'B', createdAt: new Date('2025-01-01T00:00:00Z') });
    await createScanDirect(user, siteA, { score: 90, grade: 'A', createdAt: new Date('2025-01-02T00:00:00Z') });

    // Site B: a single completed scan, score 60.
    await createScanDirect(user, siteB, { score: 60, grade: 'D', createdAt: new Date('2025-01-01T00:00:00Z') });

    // A scan that never completed must not contribute a "latest score" of
    // null/undefined for its website, and must not count toward totalScans.
    await createScanDirect(user, siteA, { status: 'running', score: null, grade: null, createdAt: new Date('2025-01-03T00:00:00Z') });

    const scanForVulns = await createScanDirect(user, siteA, { score: 90, createdAt: new Date('2025-01-02T00:00:00Z') });

    // Open vulnerabilities that must be counted:
    await createVulnerabilityDirect(user, siteA, scanForVulns, { severity: 'critical', status: 'open' });
    await createVulnerabilityDirect(user, siteA, scanForVulns, { severity: 'high', status: 'open' });
    await createVulnerabilityDirect(user, siteB, scanForVulns, { severity: 'high', status: 'open' });
    await createVulnerabilityDirect(user, siteB, scanForVulns, { severity: 'low', status: 'open' });

    // Non-open statuses that must NOT be counted, despite being real findings.
    await createVulnerabilityDirect(user, siteA, scanForVulns, { severity: 'medium', status: 'fixed' });
    await createVulnerabilityDirect(user, siteB, scanForVulns, { severity: 'critical', status: 'closed' });
    await createVulnerabilityDirect(user, siteA, scanForVulns, { severity: 'critical', status: 'false_positive' });

    const res = await request(app).get('/api/dashboard/summary').set('Authorization', authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.totalWebsites).toBe(2);
    // 2 completed for site A + 1 completed for site B + 1 more completed
    // (scanForVulns) = 4; the "running" scan is excluded.
    expect(res.body.data.totalScans).toBe(4);

    // (90 [site A latest] + 60 [site B latest]) / 2 = 75
    expect(res.body.data.averageScore).toBe(75);

    expect(res.body.data.openVulnerabilities).toBe(4);
    expect(res.body.data.riskDistribution).toEqual({
      critical: 1,
      high: 2,
      medium: 0,
      low: 1,
      info: 0,
    });

    const siteASummary = res.body.data.websitesSummary.find((w) => w._id === siteA._id.toString());
    expect(siteASummary.lastScore).toBe(null); // Website.lastScore is only ever set by the worker, not by this test's raw Scan inserts
    const siteAOpenCount = siteASummary.openVulnCount;
    expect(siteAOpenCount).toBe(2); // critical + high, both open, on site A
  });
});
