import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { sendMessage, getHistory, clearHistory } from '../controllers/chatController.js';

const router = Router();

router.use(protect);

router.post('/message', sendMessage);
router.get('/history', getHistory);
router.delete('/history', clearHistory);

export default router;
