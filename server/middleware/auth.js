import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const token = authHeader.slice(7);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    if (!user.emailVerified) {
      throw new AppError('Email verification required', 403, 'FORBIDDEN');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authenticateInternal(req, res, next) {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }
  next();
}

export function checkSubscription(req, res, next) {
  req.tier = req.user?.isPremium?.() ? 'premium' : 'free';
  next();
}

export const protect = [authenticateToken, checkSubscription];

export default protect;
