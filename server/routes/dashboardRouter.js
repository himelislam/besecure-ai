import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getSummary } from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', protect, getSummary);

export default router;
