import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return new AppError(message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors).map((e) => e.message).join('; ');
    return new AppError(message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(`Duplicate value for ${field}`, 409, 'DUPLICATE_KEY');
  }

  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  return new AppError(err.message || 'Something went wrong', err.statusCode || 500, err.code || 'INTERNAL_ERROR');
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const normalized = normalizeError(err);
  const statusCode = normalized.statusCode || 500;

  logger.error({
    message: normalized.message,
    stack: normalized.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    return res.status(500).json({ success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' });
  }

  return res.status(statusCode).json({
    success: false,
    error: normalized.message,
    code: normalized.code || 'ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: normalized.stack }),
  });
}

export default errorHandler;
