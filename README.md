# AI-Powered Web Security Audit Platform

A SaaS platform where users register websites, run automated security scans, get
AI-generated remediation guidance, track vulnerabilities over time, and learn
cybersecurity.

**Current status:** the backend API and worker (Phases 1–11) are complete — auth,
website management, baseline + deep scanning (MDN Observatory, SSLyze, ZAP, Nuclei,
testssl.sh), a deterministic scoring engine, an AI security assistant and roadmap
generator, PDF reports, and Stripe billing are all implemented, hardened, and
covered by an automated test suite. The `client/` directory is scaffolded but the
React frontend has not been built yet — everything below concerns `server/`.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (ESM only) |
| API | Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Queue | BullMQ 5 + Redis 7 (ioredis) |
| Realtime | Socket.io 4 |
| Validation | Zod 3 |
| AI | Anthropic Claude API |
| Scanners | MDN Observatory, SSLyze, OWASP ZAP, Nuclei, testssl.sh |
| Billing | Stripe |
| Files | Cloudinary |
| PDF | Puppeteer |
| Tests | Vitest + Supertest |

---

## Prerequisites

- Node.js 20 LTS
- Docker (or Colima on macOS) — used to run MongoDB, Redis, and OWASP ZAP locally
- Python 3 with `sslyze` installed (`pip3 install sslyze`) — required for TLS scanning
- [Nuclei](https://github.com/projectdiscovery/nuclei) binary installed and on `PATH` or referenced by `NUCLEI_BINARY_PATH`
- [testssl.sh](https://github.com/drwetter/testssl.sh) checked out locally (already vendored at `testssl.sh/` in this repo)
- Accounts/API keys for: Anthropic, Stripe, Cloudinary, Resend (or another SMTP provider) — only required for the features that use them; the API server boots without them

---

## Setup

```bash
# 1. Install server dependencies
cd server
npm install

# 2. Configure environment
cp .env.example .env
# Fill in real values — see "Environment Variables" below.
# Generate secrets:
openssl rand -hex 64   # run once each for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_EMAIL_SECRET
openssl rand -hex 32   # once for INTERNAL_API_KEY

# 3. Start MongoDB, Redis, and ZAP
cd ../docker
docker compose -f docker-compose.dev.yml up -d
```

---

## Running the Project

You need two long-running processes plus Docker:

```bash
# Terminal 1 — MongoDB + Redis + ZAP
cd docker
docker compose -f docker-compose.dev.yml up -d

# Terminal 2 — API server (auto-restarts on file changes)
cd server
npm run dev

# Terminal 3 — Scan/report worker (separate process, consumes BullMQ jobs)
cd server
npm run worker
```

Verify the API is up:

```bash
curl http://localhost:5000/api/health
# { "success": true, "data": { "status": "ok" } }
```

Production-style (no file watching):

```bash
cd server
npm start          # API server
npm run worker:start   # Worker
```

---

## Environment Variables

All variables live in `server/.env` (see `server/.env.example` for the annotated
template). Grouped reference:

| Group | Variables | Notes |
|---|---|---|
| App | `NODE_ENV`, `PORT`, `CLIENT_URL`, `INTERNAL_API_KEY`, `API_INTERNAL_URL` | `CLIENT_URL` is the exact CORS origin — no wildcards |
| MongoDB | `MONGODB_URI` | |
| Redis | `REDIS_URL` | Used for both BullMQ and general caching |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_EMAIL_SECRET`, `JWT_EMAIL_EXPIRES_IN` | Access token: 15m. Refresh token: 7d, httpOnly cookie only, never localStorage |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Used for verification + password reset emails |
| AI | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Powers the security assistant and roadmap generator |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` | Webhook route needs the raw request body — mounted before `express.json()` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | PDF reports + avatars |
| Scanner tools | `ZAP_API_URL`, `ZAP_API_KEY`, `ZAP_INTERNAL_PORT`, `NUCLEI_BINARY_PATH`, `TESTSSL_PATH`, `SSLYZE_PYTHON` | Use an absolute path for `SSLYZE_PYTHON` outside of a single-shell dev setup |
| Rate limiting | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_AUTH`, `RATE_LIMIT_MAX_API`, `FREE_SCANS_PER_DAY`, `FREE_AI_MESSAGES_PER_DAY`, `PREMIUM_AI_MESSAGES_PER_DAY`, `MAX_WEBSITES_FREE` | Free tier defaults: 5 auth attempts/15min, 100 API req/min, 3 scans/day, 3 websites |
| BullMQ | `SCAN_QUEUE_NAME`, `SCAN_JOB_TIMEOUT_MS`, `SCAN_JOB_ATTEMPTS` | |
| Puppeteer | `PUPPETEER_EXECUTABLE_PATH` | Only needed if the bundled Chromium can't be used (e.g. some Linux hosts) |
| Trial | `TRIAL_DAYS` | Length of the free premium trial on signup |

Full details and rationale for each variable: [`docs/08_ENV_AND_SECRETS.md`](docs/08_ENV_AND_SECRETS.md).

---

## Running Tests

```bash
cd server
npm test          # single run
npm run test:watch   # watch mode
```

Tests run against the same local MongoDB/Redis started by `docker-compose.dev.yml`,
using an isolated database (`security-platform-test`) so they never touch dev data —
each collection is cleared after every test and the database is dropped at the end
of the run. Make sure Docker is running before `npm test`.

Suite (`server/__tests__/`):
- `scoreEngine.test.js` — deterministic scoring: no findings (100/A+), severity
  deductions, floor at 0, mixed-severity breakdowns, grade boundaries
- `auth.test.js` — ownership enforcement (a user requesting another user's website
  gets 404, not 403 or a leaked existence check), unauthenticated/invalid-token
  rejection, and that password hashes never leak in API responses
- `rateLimiter.test.js` — the free-tier daily scan cap (`FREE_SCANS_PER_DAY`) is
  enforced per website and returns `429 RATE_LIMITED` once exhausted

---

## Deployment Overview

Recommended stack: **Railway or Render** for the API + worker (as two separate
services from the same repo), **MongoDB Atlas** for the database, **Upstash** for
Redis, **Vercel/Netlify** for the eventual frontend, and a small VPS (or a
persistent container) for OWASP ZAP since it needs to stay running between deep
scans. A production `Dockerfile` (API) and `Dockerfile.worker` (worker), along with
a full docker-compose + Nginx reverse-proxy config for self-hosting on a VPS, are
documented in [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md).

Key points before going live:
- Set `NODE_ENV=production`, use live Stripe keys, and terminate TLS in front of the API.
- MongoDB and Redis should not be publicly reachable — restrict by IP/VPC and use auth.
- ZAP's port must stay off the public internet; only the API/worker should reach it.
- BullMQ worker concurrency is capped at 2 — raise it only after load-testing the host.
- Point an uptime monitor at `GET /api/health`.

---

## Project Structure

See [`CLAUDE.md`](CLAUDE.md) for the full folder layout and non-negotiable coding
rules, and [`docs/`](docs/) for the complete spec (API reference, DB schema,
scanner integration, security rules, etc.). Build history and what was verified at
each phase is tracked in [`PHASES.md`](PHASES.md).
