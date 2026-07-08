# Security Rules — The Platform Must Practice What It Preaches

This platform audits other websites' security. It must set the highest standard for its own security. These rules are non-negotiable. Claude should enforce them in every piece of code it writes.

---

## Authentication Security

### Passwords
- Hash with bcrypt, cost factor 12 (never 10 or below)
- Never store plaintext, never log, never return in API responses
- Minimum 8 characters enforced at API level (not just frontend)
- Password comparison always uses `bcrypt.compare()` — never `===`

### JWT Tokens
- Access tokens: 15 minute expiry, signed with `JWT_ACCESS_SECRET`
- Refresh tokens: 7 day expiry, signed with `JWT_REFRESH_SECRET` (different secret!)
- Refresh tokens stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies ONLY — never localStorage
- Access tokens stored in memory only (Zustand store) — never localStorage, never sessionStorage
- On logout: clear httpOnly cookie server-side
- On password change: invalidate all refresh tokens for that user
- Email verification tokens: separate secret, 24h expiry, one-time use (invalidate on use)

### Session Security
```javascript
// Cookie settings for refresh token:
res.cookie('refreshToken', token, {
  httpOnly: true,           // JS cannot access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth/refresh' // only sent to refresh endpoint
});
```

---

## API Security

### Every Route
- [ ] Authentication middleware before any data access
- [ ] Zod validation on all request body, query params, route params
- [ ] Ownership check: user can only access their own resources
- [ ] Subscription check where limits apply
- [ ] Rate limiting appropriate to the endpoint

### Ownership Check Pattern
```javascript
// ALWAYS do this — don't trust userId from request body
const website = await Website.findOne({ 
  _id: req.params.id, 
  userId: req.user._id  // from verified JWT, not user input
});
if (!website) return next(new AppError('Not found', 404)); // same error for not-found AND unauthorized
```

### Input Validation (Zod)
```javascript
const createWebsiteSchema = z.object({
  url: z.string().url().max(500),
  nickname: z.string().min(1).max(100).trim()
});

// In controller:
const { url, nickname } = createWebsiteSchema.parse(req.body);
// Throws ZodError if invalid → caught by central error handler → 400
```

### Never Return Sensitive Fields
Use Mongoose `select` to exclude:
```javascript
User.findById(id).select('-password -emailVerificationToken -passwordResetToken');
```

---

## HTTP Security Headers (helmet.js)

The platform must have ALL the headers it checks for in user sites:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires this
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

## Database Security

- Never build MongoDB queries from raw user input strings
- Use Mongoose model methods — they parameterize automatically
- Disable `mongoose.set('debug', true)` in production (logs queries)
- Index all fields used in `findOne` / `find` queries (see schema)
- Soft-delete only — never hard-delete user data immediately
- Backup strategy: MongoDB Atlas automated backups OR mongodump cron

### Prevent NoSQL Injection
```javascript
// WRONG — vulnerable to NoSQL injection
User.findOne({ email: req.body.email });

// RIGHT — sanitize types
const email = String(req.body.email).toLowerCase().trim();
User.findOne({ email });
```

---

## Rate Limiting

### Auth Routes (express-rate-limit)
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,                       // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
```

### API General Rate Limit
```javascript
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute
  keyGenerator: (req) => req.user?._id?.toString() || req.ip // per user when authed
});
app.use('/api/', apiLimiter);
```

### Scan Rate Limiting (application-level, in controller)
```javascript
// Check DB or Redis before creating scan job
const today = new Date().toISOString().split('T')[0];
const scanCount = await ScanRateLimit.findOne({ userId, websiteId, date: today });
const limit = req.tier === 'premium' ? Infinity : parseInt(process.env.FREE_SCANS_PER_DAY);
if (scanCount?.scanCount >= limit) {
  throw new AppError('Daily scan limit reached', 429, 'RATE_LIMITED');
}
```

---

## File Upload Security

Only Cloudinary is used for uploads (no local file system storage).

```javascript
// On the client side — upload avatar directly to Cloudinary with upload preset
// Never send file to YOUR server, then to Cloudinary

// If you must accept file uploads:
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB
```

---

## Logging Security (Winston)

```javascript
// NEVER log these:
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

// Winston formatter that scrubs sensitive fields:
const scrubSecrets = winston.format((info) => {
  for (const field of SENSITIVE_FIELDS) {
    if (info[field]) info[field] = '[REDACTED]';
  }
  return info;
});

// Log levels:
// - error: unhandled exceptions, scanner failures, payment errors
// - warn: rate limit hits, failed auth attempts, validation errors
// - info: scan started/completed, user registered, subscription changed
// - debug: (dev only) — request details, DB queries
```

---

## CORS

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,     // Exact origin only — NO wildcard
  credentials: true,                   // Allow cookies (refresh token)
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Scanner Isolation

- OWASP ZAP runs in its own Docker container — isolated from main app
- SSLyze, Nuclei, testssl.sh run as subprocesses — not imported as code
- If subprocess output parse fails → log error, continue with other tools
- Never `eval()` or `exec()` user-provided input as shell commands
- If user adds a URL, never pass it directly to shell: `execFile('nuclei', ['-u', url])` not `exec('nuclei -u ' + url)`
  - Use `execFile` or `spawn` with array arguments (not string interpolation)

---

## Stripe Webhook Security

```javascript
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }
  
  // process event...
});

// IMPORTANT: The stripe webhook route must use express.raw() NOT express.json()
// Register it BEFORE the express.json() middleware
```

---

## Error Handling — Never Leak Details in Production

```javascript
// Central error handler (middleware/errorHandler.js):
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log all errors
  logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });
  
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    // Never expose internal errors in production
    return res.status(500).json({ success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' });
  }
  
  return res.status(statusCode).json({
    success: false,
    error: err.message,
    code: err.code || 'ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

---

## Domain Verification — Non-Negotiable Before Active Scanning

```javascript
// In scan controller:
if (scanType === 'deep') {
  const website = await Website.findById(websiteId);
  
  if (!website.verified) {
    throw new AppError(
      'Domain verification required before running deep scans. Verify ownership first.',
      403,
      'DOMAIN_NOT_VERIFIED'
    );
  }
  
  if (req.tier !== 'premium') {
    throw new AppError(
      'Deep scans require a premium subscription.',
      403,
      'PLAN_LIMIT_REACHED'
    );
  }
}
```

---

## Security Checklist Before Any Deployment

- [ ] All environment variables set in hosting provider secrets (not .env file)
- [ ] NODE_ENV=production
- [ ] HTTPS enforced (SSL certificate on domain)
- [ ] MongoDB IP whitelist set (only allow server IPs)
- [ ] Redis auth password set
- [ ] Stripe using live keys
- [ ] Webhook endpoint tested with Stripe CLI
- [ ] Rate limiting tested
- [ ] Error responses don't leak stack traces
- [ ] Run platform's own scanner against itself — fix any findings!
