import winston from 'winston';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

function isSensitiveKey(key) {
  const lower = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lower.includes(field));
}

function scrub(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = scrub(val, seen);
      }
    }
    return result;
  }

  return value;
}

const scrubSecrets = winston.format((info) => {
  const { level, message, timestamp, ...rest } = info;
  const scrubbedRest = scrub(rest);
  return { level, message, timestamp, ...scrubbedRest };
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    scrubSecrets(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        scrubSecrets(),
        winston.format.printf(({ level, message, timestamp, ...rest }) => {
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} [${level}]: ${typeof message === 'string' ? message : JSON.stringify(message)}${extra}`;
        })
      ),
    }),
  ],
});

export default logger;
