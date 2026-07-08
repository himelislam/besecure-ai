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
import { listScansForWebsite } from '../controllers/scanController.js';

const router = Router();

router.use(protect);

router.get('/', listWebsites);
router.post('/', createWebsite);
router.get('/:id', getWebsite);
router.patch('/:id', updateWebsite);
router.delete('/:id', deleteWebsite);
router.get('/:id/verify', initiateVerification);
router.post('/:id/verify', checkVerification);
router.get('/:websiteId/scans', listScansForWebsite);

export default router;
