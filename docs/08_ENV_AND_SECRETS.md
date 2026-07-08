# Environment Variables and Secrets

Copy this file to `/server/.env` and fill in real values.
Never commit `.env` to Git. Always commit `.env.example` (with blank values).

---

## /server/.env

```bash
# ─── App ───────────────────────────────────────────────────────────
NODE_ENV=development            # 'development' | 'production' | 'test'
PORT=5000                       # API server port
CLIENT_URL=http://localhost:5173  # Frontend URL (for CORS + email links)
INTERNAL_API_KEY=               # Strong random string for internal service calls (worker → API)

# ─── MongoDB ───────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/security-platform
# Production example: mongodb+srv://user:pass@cluster.mongodb.net/security-platform

# ─── Redis ─────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# Production example: redis://default:password@redis-host:6379

# ─── JWT ───────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=              # 64+ char random string (use: openssl rand -hex 64)
JWT_REFRESH_SECRET=             # Different 64+ char random string
JWT_ACCESS_EXPIRES_IN=15m       # 15 minutes
JWT_REFRESH_EXPIRES_IN=7d       # 7 days
JWT_EMAIL_SECRET=               # For email verification + password reset tokens (64+ chars)
JWT_EMAIL_EXPIRES_IN=24h        # Verification links expire in 24 hours

# ─── Email ─────────────────────────────────────────────────────────
# Option A: Resend (recommended — free 3000 emails/month)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Security Audit Platform

# Option B: Gmail SMTP (dev only — not for production)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=yourapp@gmail.com
# SMTP_PASS=your-app-password     # Gmail app password, not your real password

# ─── Anthropic (Claude AI) ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-6

# ─── OpenAI (Fallback) ─────────────────────────────────────────────
# OPENAI_API_KEY=sk-xxxxxxxxxxxx   # Optional fallback

# ─── Stripe ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx      # Use sk_live_ in production
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx # Also needed in frontend .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx    # From Stripe dashboard webhook settings
STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxx  # Create in Stripe dashboard

# ─── Cloudinary ────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxxxx

# ─── Scanner Tools ────────────────────────────────────────────────
ZAP_API_URL=http://localhost:8090   # ZAP Docker container URL
ZAP_API_KEY=                        # Set to empty to disable ZAP API key in dev
NUCLEI_BINARY_PATH=/usr/local/bin/nuclei
TESTSSL_PATH=./testssl.sh/testssl.sh
SSLYZE_PYTHON=python3               # Python command to use for SSLyze

# ─── Rate Limiting ─────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000         # 15 minutes in ms
RATE_LIMIT_MAX_AUTH=5               # Max auth attempts per window
RATE_LIMIT_MAX_API=100              # Max general API requests per window
FREE_SCANS_PER_DAY=3                # Free tier daily scan limit per website
FREE_AI_MESSAGES_PER_DAY=20        # Free tier AI chat messages per day
PREMIUM_AI_MESSAGES_PER_DAY=200    # Premium tier AI chat messages per day
MAX_WEBSITES_FREE=3                 # Free tier website limit

# ─── BullMQ ───────────────────────────────────────────────────────
SCAN_QUEUE_NAME=scan-queue
SCAN_JOB_TIMEOUT_MS=600000         # 10 minutes max per scan job
SCAN_JOB_ATTEMPTS=1                # Don't auto-retry failed scans (could re-trigger active scan)

# ─── Puppeteer ─────────────────────────────────────────────────────
PUPPETEER_EXECUTABLE_PATH=         # Leave empty to use bundled Chromium
# On some Linux servers: /usr/bin/google-chrome

# ─── Trial ─────────────────────────────────────────────────────────
TRIAL_DAYS=14
```

---

## /client/.env

```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

---

## Secrets You Need to Create

### Generate JWT secrets (run in terminal):
```bash
openssl rand -hex 64
# Run 3 times — one for each JWT secret
```

### Generate Internal API Key:
```bash
openssl rand -hex 32
```

### Stripe Setup:
1. Create account at stripe.com
2. Go to Dashboard → Developers → API Keys
3. Copy test secret key and publishable key
4. Create a product: Dashboard → Products → Add Product → "Premium Plan" → $X/month
5. Copy the Price ID (starts with `price_`)
6. Set up webhook: Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/webhooks/stripe`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
7. Copy webhook signing secret

### Cloudinary Setup:
1. Create account at cloudinary.com (free tier: 25GB storage)
2. Dashboard → Settings → API Keys → Copy cloud name, API key, API secret
3. Create two upload presets: `avatars` and `reports`

### Anthropic API Key:
1. console.anthropic.com → API Keys → Create Key
2. Set a spending limit (recommended during development)

### Resend Email:
1. resend.com → API Keys → Create Key
2. Add and verify your sending domain

---

## Environment Validation (runs on server startup)

Create `/server/config/validateEnv.js`:
```javascript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  CLIENT_URL: z.string().url(),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EMAIL_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PREMIUM_PRICE_ID: z.string().startsWith('price_'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  INTERNAL_API_KEY: z.string().min(32),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}
```

Call `validateEnv()` at the very top of `server.js` before anything else.

---

## Security Notes
- JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different strings
- Never use the same secret for email tokens (JWT_EMAIL_SECRET) and auth tokens
- In production: store secrets in your hosting provider's secrets manager (Railway secrets, Render secrets, AWS Secrets Manager), not a .env file
- Rotate secrets if compromised — this invalidates all existing tokens
- The INTERNAL_API_KEY protects the `/internal/*` routes that the worker calls on the API server — keep it secret
