import { Router } from 'express';
import { authLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', strictLimiter, resetPassword);
router.post('/refresh', refreshToken);

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

export default router;
