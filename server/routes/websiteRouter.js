import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listWebsites,
  createWebsite,
  getWebsite,
  updateWebsite,
  deleteWebsite,
  initiateVerification,
  checkVerification,
} from '../controllers/websiteController.js';

const router = Router();

router.use(protect);

router.get('/', listWebsites);
router.post('/', createWebsite);
router.get('/:id', getWebsite);
router.patch('/:id', updateWebsite);
router.delete('/:id', deleteWebsite);
router.get('/:id/verify', initiateVerification);
router.post('/:id/verify', checkVerification);

export default router;
