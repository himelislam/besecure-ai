import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createCheckout, createPortal, getSubscription } from '../controllers/billingController.js';

const router = Router();

router.use(protect);

router.post('/create-checkout', createCheckout);
router.post('/create-portal', createPortal);
router.get('/subscription', getSubscription);

export default router;
