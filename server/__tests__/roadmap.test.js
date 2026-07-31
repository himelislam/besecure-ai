import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../services/ai/roadmapGenerator.js', () => ({ generateRoadmap: vi.fn() }));

import app from '../app.js';
import Roadmap from '../models/Roadmap.js';
import { generateRoadmap as callRoadmapGenerator } from '../services/ai/roadmapGenerator.js';
import { createVerifiedUser, createWebsiteDirect, createScanDirect, authHeader } from './helpers.js';

const FAKE_RESULT = {
  summary: 'Your site has a moderate posture; prioritize header fixes.',
  estimatedStartScore: 70,
  estimatedEndScore: 90,
  steps: [
    {
      week: 1,
      title: 'Add security headers',
      why: 'Missing headers expose the site to common attacks.',
      how: 'Add CSP, HSTS, X-Frame-Options.',
      estimatedScoreGain: 15,
      severity: 'high',
    },
  ],
  tokenUsage: { inputTokens: 500, outputTokens: 300 },
};

beforeEach(() => {
  callRoadmapGenerator.mockReset();
});

describe('roadmap generation', () => {
  it('generates synchronously (the response already contains the completed roadmap) and retrieval matches', async () => {
    const user = await createVerifiedUser('roadmapowner@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    callRoadmapGenerator.mockResolvedValue(FAKE_RESULT);

    const genRes = await request(app)
      .post(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));

    expect(genRes.status).toBe(201);
    expect(genRes.body.data.roadmap.status).toBe('completed');
    expect(genRes.body.data.roadmap.summary).toBe(FAKE_RESULT.summary);
    expect(genRes.body.data.roadmap.steps).toHaveLength(1);
    expect(genRes.body.data.roadmap.steps[0].title).toBe('Add security headers');

    const getRes = await request(app)
      .get(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.roadmap._id).toBe(genRes.body.data.roadmap._id);
  });

  it('does not duplicate on a second POST — returns the same document and does not call the AI again', async () => {
    const user = await createVerifiedUser('roadmapidempotent@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    callRoadmapGenerator.mockResolvedValue(FAKE_RESULT);

    const firstRes = await request(app)
      .post(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(firstRes.status).toBe(201);
    expect(callRoadmapGenerator).toHaveBeenCalledTimes(1);

    const secondRes = await request(app)
      .post(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));

    // Cached-return path: 200, not 201 — no new generation happened.
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.roadmap._id).toBe(firstRes.body.data.roadmap._id);
    expect(callRoadmapGenerator).toHaveBeenCalledTimes(1); // still just once

    const count = await Roadmap.countDocuments({ scanId: scan._id });
    expect(count).toBe(1);
  });

  it('retrying after a failed generation reuses the same document instead of creating a duplicate', async () => {
    const user = await createVerifiedUser('roadmapretry@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    callRoadmapGenerator.mockRejectedValueOnce(new Error('AI assistant is temporarily unavailable. Please try again.'));

    const failedRes = await request(app)
      .post(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(failedRes.status).toBe(500);

    const failedDoc = await Roadmap.findOne({ scanId: scan._id });
    expect(failedDoc.status).toBe('failed');

    callRoadmapGenerator.mockResolvedValueOnce(FAKE_RESULT);
    const retryRes = await request(app)
      .post(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.data.roadmap.status).toBe('completed');
    expect(retryRes.body.data.roadmap._id).toBe(failedDoc._id.toString());

    const count = await Roadmap.countDocuments({ scanId: scan._id });
    expect(count).toBe(1);
  });

  it('returns distinct 404s for "scan not found" vs "roadmap not found"', async () => {
    const user = await createVerifiedUser('roadmap404@example.com');
    const website = await createWebsiteDirect(user);
    const scan = await createScanDirect(user, website);

    const noScanRes = await request(app)
      .get('/api/roadmaps/507f1f77bcf86cd799439011')
      .set('Authorization', authHeader(user));
    expect(noScanRes.status).toBe(404);
    expect(noScanRes.body.error).toBe('Scan not found');

    const noRoadmapRes = await request(app)
      .get(`/api/roadmaps/${scan._id}`)
      .set('Authorization', authHeader(user));
    expect(noRoadmapRes.status).toBe(404);
    expect(noRoadmapRes.body.error).toBe('Roadmap not found');
  });
});
