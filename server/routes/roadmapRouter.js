import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { generateRoadmap, getRoadmap, updateStep } from '../controllers/roadmapController.js';

const router = Router();

router.use(protect);

router.post('/:scanId', generateRoadmap);
router.get('/:scanId', getRoadmap);
router.patch('/:roadmapId/steps/:stepId', updateStep);

export default router;
