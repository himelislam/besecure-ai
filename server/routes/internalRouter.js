import { Router } from 'express';
import { authenticateInternal } from '../middleware/auth.js';
import { emitToUser } from '../config/socket.js';

const router = Router();

router.post('/emit', authenticateInternal, (req, res) => {
  const { userId, event, data } = req.body;
  emitToUser(userId, event, data);
  res.status(200).json({ success: true });
});

export default router;
