export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguish from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  DOMAIN_NOT_VERIFIED: 'DOMAIN_NOT_VERIFIED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export default AppError;
