import { Router } from 'express';
import { z } from 'zod';
import { authenticateInternal } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { emitToUser } from '../config/socket.js';

const router = Router();

const emitSchema = z.object({
  userId: z.string().min(1),
  event: z.string().min(1),
  data: z.record(z.any()),
});

router.post('/emit', apiLimiter, authenticateInternal, (req, res, next) => {
  try {
    const { userId, event, data } = emitSchema.parse(req.body);
    emitToUser(userId, event, data);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
