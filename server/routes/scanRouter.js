import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createScan, getScan, getScanFindings } from '../controllers/scanController.js';

const router = Router();

router.use(protect);

router.post('/', createScan);
router.get('/:id', getScan);
router.get('/:id/findings', getScanFindings);

export default router;
