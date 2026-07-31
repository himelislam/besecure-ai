import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Scan from '../models/Scan.js';
import Vulnerability from '../models/Vulnerability.js';
import { createVerifiedUser, createWebsiteDirect, authHeader } from './helpers.js';

// Note: the free-tier "4th scan on one website RATE_LIMITED, independent per
// website" behavior is already fully covered by __tests__/rateLimiter.test.js
// (`scopes the daily limit per website, not globally per user`) — not
// duplicated here.
//
// Note: actually running a scan through to completion requires a live
// scanWorker consuming a real BullMQ job, which in turn shells out to real
// scanner tools (MDN Observatory, SSLyze, ZAP, Nuclei, testssl.sh) against a
// real target URL over the network. That's not something a hermetic,
// deterministic test suite can (or should) drive. Instead, the "eventual
// completed status and findings persisted" case below writes directly to
// Mongo using exactly the fields scanWorker.js's own
// `Scan.findByIdAndUpdate(...)` / `Vulnerability.create(...)` calls produce
// (see services/queue/scanWorker.js), then exercises the real GET endpoints
// against that state — validating the read side of the contract without
// needing the scanning pipeline itself.

describe('scans', () => {
  it('creates a baseline scan and returns queued status', async () => {
    const user = await createVerifiedUser('scanowner@example.com');
    const website = await createWebsiteDirect(user);

    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', authHeader(user))
      .send({ websiteId: website._id.toString(), type: 'baseline' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('queued');

    const stored = await Scan.findById(res.body.data.scanId);
    expect(stored.status).toBe('queued');
    expect(stored.type).toBe('baseline');
    expect(stored.targetUrl).toBe(website.url);
  });

  it('rejects a deep scan on an unverified domain with 403 DOMAIN_NOT_VERIFIED', async () => {
    const user = await createVerifiedUser('deepscanowner@example.com');
    const website = await createWebsiteDirect(user, { verified: false });

    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', authHeader(user))
      .send({ websiteId: website._id.toString(), type: 'deep' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('DOMAIN_NOT_VERIFIED');
  });

  it('reflects a completed scan and its persisted findings via the real GET endpoints', async () => {
    const user = await createVerifiedUser('completedscan@example.com');
    const website = await createWebsiteDirect(user);

    const createRes = await request(app)
      .post('/api/scans')
      .set('Authorization', authHeader(user))
      .send({ websiteId: website._id.toString(), type: 'baseline' });
    const scanId = createRes.body.data.scanId;

    // Simulate exactly what scanWorker.js's processScan() does on success.
    const completedAt = new Date();
    await Scan.findByIdAndUpdate(scanId, {
      status: 'completed',
      score: 73,
      grade: 'C',
      findingCounts: { critical: 0, high: 1, medium: 1, low: 0, info: 0 },
      toolsRun: [{ name: 'observatory', status: 'success', durationMs: 1200, error: null }],
      completedAt,
      durationMs: 4000,
      progress: 100,
      progressMessage: 'complete',
    });

    const highFinding = await Vulnerability.create({
      userId: user._id,
      websiteId: website._id,
      scanId,
      title: 'Missing HSTS Header',
      description: 'No Strict-Transport-Security header.',
      severity: 'high',
      category: 'Security Headers',
      owaspCategory: 'A02',
      owaspTitle: 'Cryptographic Failures',
      recommendation: 'Add a Strict-Transport-Security header.',
      detectedBy: 'observatory',
      toolFindingId: 'hsts-missing',
    });
    const mediumFinding = await Vulnerability.create({
      userId: user._id,
      websiteId: website._id,
      scanId,
      title: 'Missing CSP Header',
      description: 'No Content-Security-Policy header.',
      severity: 'medium',
      category: 'Security Headers',
      owaspCategory: 'A05',
      owaspTitle: 'Security Misconfiguration',
      recommendation: 'Add a Content-Security-Policy header.',
      detectedBy: 'observatory',
      toolFindingId: 'csp-missing',
    });

    const getScanRes = await request(app).get(`/api/scans/${scanId}`).set('Authorization', authHeader(user));
    expect(getScanRes.status).toBe(200);
    expect(getScanRes.body.data.scan.status).toBe('completed');
    expect(getScanRes.body.data.scan.score).toBe(73);
    expect(getScanRes.body.data.scan.grade).toBe('C');
    expect(getScanRes.body.data.scan.findingCounts).toEqual({ critical: 0, high: 1, medium: 1, low: 0, info: 0 });

    const findingsRes = await request(app)
      .get(`/api/scans/${scanId}/findings`)
      .set('Authorization', authHeader(user));
    expect(findingsRes.status).toBe(200);
    expect(findingsRes.body.data.total).toBe(2);
    const ids = findingsRes.body.data.vulnerabilities.map((v) => v._id).sort();
    expect(ids).toEqual([highFinding._id.toString(), mediumFinding._id.toString()].sort());
  });
});
