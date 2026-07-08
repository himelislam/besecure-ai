import { Router } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';

const router = Router();

router.get('/health', async (req, res) => {
  const mongoState = mongoose.connection.readyState === 1 ? 'ok' : 'down';

  let redisState = 'down';
  try {
    const pong = await getRedisClient().ping();
    redisState = pong === 'PONG' ? 'ok' : 'down';
  } catch {
    redisState = 'down';
  }

  const services = { mongodb: mongoState, redis: redisState };
  const allOk = Object.values(services).every((s) => s === 'ok');

  res.status(allOk ? 200 : 503).json({
    success: allOk,
    data: {
      status: allOk ? 'ok' : 'degraded',
      services,
    },
  });
});

export default router;
