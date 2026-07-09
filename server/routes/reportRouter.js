import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { generateReport, getReport, listReports } from '../controllers/reportController.js';

const router = Router();

router.use(protect);

router.post('/:scanId', generateReport);
router.get('/:id', getReport);
router.get('/', listReports);

export default router;
