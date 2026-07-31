import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Vulnerability from '../models/Vulnerability.js';
import { createVerifiedUser, createWebsiteDirect, createScanDirect, createVulnerabilityDirect, authHeader } from './helpers.js';

describe('vulnerability status transitions', () => {
  it('accepts a legal transition (open -> assigned) and persists it', async () => {
    const user = await createVerifiedUser('legaltransition@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);
    const vuln = await createVulnerabilityDirect(user, website, scan, { status: 'open' });

    const res = await request(app)
      .patch(`/api/vulnerabilities/${vuln._id}`)
      .set('Authorization', authHeader(user))
      .send({ status: 'assigned' });

    expect(res.status).toBe(200);
    expect(res.body.data.vulnerability.status).toBe('assigned');

    const stored = await Vulnerability.findById(vuln._id);
    expect(stored.status).toBe('assigned');
  });

  it('rejects an illegal transition (open -> fixed) with 400 INVALID_INPUT', async () => {
    const user = await createVerifiedUser('illegaltransition@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);
    // "fixed" is not in VALID_STATUS_TRANSITIONS.open — only assigned/
    // in_progress/false_positive/closed are legal directly from open.
    const vuln = await createVulnerabilityDirect(user, website, scan, { status: 'open' });

    const res = await request(app)
      .patch(`/api/vulnerabilities/${vuln._id}`)
      .set('Authorization', authHeader(user))
      .send({ status: 'fixed' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
    expect(res.body.error).toMatch(/Cannot transition vulnerability from "open" to "fixed"/);

    const stored = await Vulnerability.findById(vuln._id);
    expect(stored.status).toBe('open'); // unchanged
  });

  it('rejects "verified" as an input status with 400 VALIDATION_ERROR — it is not a selectable enum value at all', async () => {
    const user = await createVerifiedUser('verifiedinput@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);
    // Even from "fixed", where verified IS a legal next state per
    // VALID_STATUS_TRANSITIONS, the Zod schema itself excludes "verified"
    // from the enum entirely — the request never even reaches the
    // transition-table check; it's rejected at validation with
    // VALIDATION_ERROR, not INVALID_INPUT.
    const vuln = await createVulnerabilityDirect(user, website, scan, { status: 'fixed' });

    const res = await request(app)
      .patch(`/api/vulnerabilities/${vuln._id}`)
      .set('Authorization', authHeader(user))
      .send({ status: 'verified' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');

    const stored = await Vulnerability.findById(vuln._id);
    expect(stored.status).toBe('fixed'); // unchanged
  });
});
