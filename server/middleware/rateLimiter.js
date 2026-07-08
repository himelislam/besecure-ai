import rateLimit from 'express-rate-limit';

function keyByUserOrIp(req) {
  return req.user?._id?.toString() || req.ip;
}

export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_AUTH) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Try again in 15 minutes.', code: 'RATE_LIMITED' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_API) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { success: false, error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { success: false, error: 'Too many requests. Try again in 1 hour.', code: 'RATE_LIMITED' },
});

export default { authLimiter, apiLimiter, strictLimiter };
