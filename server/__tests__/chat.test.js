import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../services/ai/assistant.js', () => ({ sendMessage: vi.fn() }));

import app from '../app.js';
import ChatMessage from '../models/ChatMessage.js';
import { sendMessage as callAssistant } from '../services/ai/assistant.js';
import { createFreeTierUser, createPremiumUser, authHeader } from './helpers.js';

const FREE_AI_MESSAGES_PER_DAY = parseInt(process.env.FREE_AI_MESSAGES_PER_DAY) || 20;

beforeEach(() => {
  callAssistant.mockReset();
});

describe('chat daily quota', () => {
  it(`allows exactly ${FREE_AI_MESSAGES_PER_DAY} messages/day then returns RATE_LIMITED on the next one, without ever calling the AI`, async () => {
    const user = await createFreeTierUser('chatquota@example.com');

    // Seed N-1 user messages directly (already at today) so only one more
    // request over the API is needed to hit the boundary.
    const seeded = Array.from({ length: FREE_AI_MESSAGES_PER_DAY - 1 }, (_, i) => ({
      userId: user._id,
      role: 'user',
      content: `seed message ${i}`,
      tier: 'free',
    }));
    await ChatMessage.insertMany(seeded);

    callAssistant.mockResolvedValue({ content: 'A real reply.', inputTokens: 10, outputTokens: 5 });

    // The Nth message (bringing today's count to the limit) should still succeed.
    const okRes = await request(app)
      .post('/api/chat/message')
      .set('Authorization', authHeader(user))
      .send({ content: 'This should still be allowed.' });
    expect(okRes.status).toBe(200);
    expect(callAssistant).toHaveBeenCalledTimes(1);

    // The (N+1)th message must be rejected before the AI is ever invoked.
    const blockedRes = await request(app)
      .post('/api/chat/message')
      .set('Authorization', authHeader(user))
      .send({ content: 'This should be blocked.' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.code).toBe('RATE_LIMITED');
    expect(blockedRes.body.error).toMatch(/daily ai message limit/i);
    // Still just the one call from the successful request above — the quota
    // check happens before callAssistant, so the blocked request never
    // reaches it.
    expect(callAssistant).toHaveBeenCalledTimes(1);

    const userMessageCount = await ChatMessage.countDocuments({ userId: user._id, role: 'user' });
    expect(userMessageCount).toBe(FREE_AI_MESSAGES_PER_DAY); // the blocked attempt is never persisted
  });

  it('a premium user is not subject to the free-tier ceiling', async () => {
    const user = await createPremiumUser('chatpremium@example.com');

    const seeded = Array.from({ length: FREE_AI_MESSAGES_PER_DAY }, (_, i) => ({
      userId: user._id,
      role: 'user',
      content: `seed message ${i}`,
      tier: 'premium',
    }));
    await ChatMessage.insertMany(seeded);

    callAssistant.mockResolvedValue({ content: 'Still working.', inputTokens: 10, outputTokens: 5 });

    const res = await request(app)
      .post('/api/chat/message')
      .set('Authorization', authHeader(user))
      .send({ content: 'Past the free-tier ceiling, but I am premium.' });

    expect(res.status).toBe(200);
    expect(callAssistant).toHaveBeenCalledTimes(1);
  });
});
