# PHASES.md — Build Progress Tracker

> Claude Code: Read this at the start of every session.
> When you finish a task, mark it [x]. When a full phase is done, move it to Completed.

---

## ▶ CURRENT PHASE: Phase 2 — Authentication

---

## Phase 1 — Foundation ✅
**Goal:** Server starts, connects to MongoDB + Redis, health check returns 200.

### Backend
- [x] `server/package.json` with all dependencies
- [x] `server/.env.example` (all keys, no real values)
- [x] `server/config/validateEnv.js` — Zod env validation, exits if invalid
- [x] `server/config/db.js` — Mongoose connect + reconnect
- [x] `server/config/redis.js` — ioredis connection + bullMQConnection export
- [x] `server/config/cloudinary.js` — Cloudinary SDK init
- [x] `server/config/stripe.js` — Stripe SDK init
- [x] `server/config/socket.js` — Socket.io init + emitToUser() helper
- [x] `server/utils/AppError.js` — Custom error class with ErrorCodes
- [x] `server/utils/logger.js` — Winston logger with secret scrubber
- [x] `server/middleware/errorHandler.js` — Central error + 404 handler
- [x] `server/middleware/rateLimiter.js` — authLimiter, apiLimiter, strictLimiter
- [x] `server/app.js` — Express setup (helmet, cors, morgan, json, routes mount)
- [x] `server/server.js` — HTTP server + graceful shutdown + unhandledRejection handler
- [x] `server/routes/healthRouter.js` — GET /api/health (checks DB + Redis)
- [x] `docker/docker-compose.dev.yml` — MongoDB 7 + Redis 7

### Done When
`curl http://localhost:5000/api/health` returns `{ success: true, data: { status: "ok" } }`

**Verified:** `{"success":true,"data":{"status":"ok","services":{"mongodb":"ok","redis":"ok"}}}`. Tested on port 5050 locally — macOS's built-in AirPlay Receiver occupies port 5000 on this dev machine (see Blockers below). Code defaults to `PORT=5000` per spec; no code change needed, just a local port conflict.

---

## Phase 2 — Authentication
**Goal:** register → verify email → login → refresh → logout → reset password, all working.  
**Depends on:** Phase 1

### Backend
- [ ] `server/models/User.js` — full schema with subscription fields
- [ ] `server/schemas/authSchemas.js` — Zod schemas for all auth endpoints
- [ ] `server/services/email/emailService.js` — Resend/Nodemailer wrappers
- [ ] `server/services/email/templates/verificationEmail.js`
- [ ] `server/services/email/templates/passwordResetEmail.js`
- [ ] `server/middleware/auth.js` — authenticateToken, authenticateInternal, checkSubscription, protect
- [ ] `server/controllers/authController.js` — register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, getMe, updateMe, changePassword
- [ ] `server/routes/authRouter.js`
- [ ] Wire auth routes into `app.js`

### Done When
- POST /api/auth/register → user created, verification email sent
- GET /api/auth/verify-email?token=xxx → emailVerified=true
- POST /api/auth/login → access token in body, refresh token in httpOnly cookie
- POST /api/auth/refresh → new access token
- POST /api/auth/logout → cookie cleared
- POST /api/auth/forgot-password → reset email sent
- POST /api/auth/reset-password → password updated

---

## Phase 3 — Website Management
**Goal:** Users can add websites, verify domain ownership, manage their list.  
**Depends on:** Phase 2

### Backend
- [ ] `server/models/Website.js`
- [ ] `server/schemas/websiteSchemas.js` — create, update, list schemas
- [ ] `server/utils/urlNormalizer.js` — strip path/port, force https
- [ ] `server/utils/tokenGenerator.js` — generate `sav-verify-{uuid}` token
- [ ] `server/services/verification/dnsVerifier.js` — dns.promises.resolveTxt()
- [ ] `server/services/verification/metaTagVerifier.js` — fetch + cheerio parse
- [ ] `server/controllers/websiteController.js` — list, create, get, update, delete, initiateVerification, checkVerification
- [ ] `server/routes/websiteRouter.js`
- [ ] Wire website routes into `app.js`

### Done When
- POST /api/websites creates website with verificationToken
- POST /api/websites/:id/verify checks DNS TXT or meta tag and sets verified=true
- Free tier cannot add more than 3 websites

---

## Phase 4 — Baseline Scanner (Core)
**Goal:** End-to-end async scan: trigger → queue → worker → normalize → DB → Socket.io event.  
**Depends on:** Phase 3  
**NOTE: Most complex phase — build step by step.**

### Models
- [ ] `server/models/Scan.js`
- [ ] `server/models/Vulnerability.js`
- [ ] `server/models/ScanRateLimit.js`

### Scanner Tools + Services
- [ ] `server/services/queue/scanQueue.js` — BullMQ Queue definition + enqueueScan()
- [ ] `server/services/scanner/tools/observatoryRunner.js`
- [ ] `server/services/scanner/tools/sslyzeRunner.js`
- [ ] `server/services/scanner/normalizer.js` — Observatory + SSLyze output → unified finding
- [ ] `server/services/scoring/scoreEngine.js` — deterministic score calculation

### Worker (separate process)
- [ ] `server/services/queue/scanWorker.js` — full processor: run tools → normalize → deduplicate → score → save → emit
- [ ] `server/workers/index.js` — worker entry point

### API + Socket.io
- [ ] `server/schemas/scanSchemas.js`
- [ ] `server/controllers/scanController.js` — createScan, getScan, listScansForWebsite, getFindings
- [ ] `server/controllers/vulnerabilityController.js` — list (filters), get, update, stats
- [ ] `server/routes/scanRouter.js`
- [ ] `server/routes/vulnerabilityRouter.js`
- [ ] `server/routes/internalRouter.js` — POST /internal/emit (internal API key auth)
- [ ] Wire all routes into `app.js`

### Done When
- POST /api/scans returns `{ scanId, status: "queued" }`
- Worker picks up job, runs Observatory + SSLyze
- Socket.io emits scan:progress and scan:complete to frontend
- Vulnerabilities saved with correct severity + OWASP mapping
- Score and grade stored on Scan document
- Free tier capped at 3 scans/day/website

---

## Phase 5 — Dashboard & Analytics
**Goal:** Dashboard API returns all chart data in one call.  
**Depends on:** Phase 4

- [ ] `server/controllers/dashboardController.js` — getSummary (parallel queries with Promise.all)
- [ ] `server/routes/dashboardRouter.js`
- [ ] Wire into `app.js`
- [ ] Verify all MongoDB indexes from `docs/04_DATABASE_SCHEMA.md` exist

### Done When
GET /api/dashboard/summary returns: totalWebsites, totalScans, openVulnerabilities, averageScore, scoreHistory, recentScans, riskDistribution

---

## Phase 6 — AI Security Assistant
**Goal:** Context-aware chat with Claude API, rate-limited, scan context attachable.  
**Depends on:** Phase 4

- [ ] `server/models/ChatMessage.js`
- [ ] `server/services/ai/promptBuilder.js` — builds system prompt with scan context + OWASP definitions
- [ ] `server/services/ai/assistant.js` — Claude API call with prompt caching
- [ ] `server/controllers/chatController.js` — sendMessage, getHistory, clearHistory
- [ ] `server/routes/chatRouter.js`
- [ ] Wire into `app.js`

### Done When
POST /api/chat with optional scanId → AI response with "AI-Assisted Guidance" label
Rate limit: 20 messages/day free, 200/day premium

---

## Phase 7 — AI Roadmap Generator
**Goal:** Claude generates a week-by-week remediation plan from scan findings, stored in DB.  
**Depends on:** Phase 6

- [ ] `server/models/Roadmap.js`
- [ ] `server/services/ai/roadmapGenerator.js` — Claude API → parse JSON roadmap
- [ ] `server/controllers/roadmapController.js` — generate, get, updateStep
- [ ] `server/routes/roadmapRouter.js`
- [ ] Wire into `app.js`

### Done When
POST /api/roadmaps/:scanId generates and returns a structured roadmap with week-by-week steps

---

## Phase 8 — PDF Report Generation
**Goal:** Puppeteer generates PDF with AI executive summary, stored in Cloudinary.  
**Depends on:** Phase 7

- [ ] `server/models/Report.js`
- [ ] `server/services/pdf/reportTemplate.js` — HTML template (inline CSS only for Puppeteer)
- [ ] `server/services/pdf/reportGenerator.js` — Puppeteer launch → PDF buffer → Cloudinary upload
- [ ] `server/services/queue/reportQueue.js` — BullMQ queue for PDF jobs
- [ ] `server/services/queue/reportWorker.js` — report worker processor
- [ ] `server/controllers/reportController.js` — generate, get, listReports
- [ ] `server/routes/reportRouter.js`
- [ ] Add internal report template route: GET /internal/report-template/:scanId
- [ ] Wire into `app.js` + add reportWorker to `workers/index.js`

### Done When
POST /api/reports/:scanId → generates PDF → uploads to Cloudinary → returns download URL

---

## Phase 9 — Deep Scanner
**Goal:** ZAP + Nuclei + testssl.sh for verified premium domains.  
**Depends on:** Phase 4

- [ ] `server/services/scanner/tools/zapRunner.js` — HTTP calls to ZAP REST API
- [ ] `server/services/scanner/tools/nucleiRunner.js` — execFile subprocess, JSONL output
- [ ] `server/services/scanner/tools/testsslRunner.js` — execFile subprocess, JSON output
- [ ] Extend `normalizer.js` with ZAP, Nuclei, testssl mappings
- [ ] Extend `scanWorker.js` to run deep tools when `type === 'deep'`
- [ ] Gate deep scan in `scanController.createScan`: verified + premium check
- [ ] Add ZAP service to `docker/docker-compose.dev.yml`
- [ ] `docker/zap/zap-baseline.yaml` — ZAP Automation Framework config

### Done When
Premium + verified domain users can run deep scans that include ZAP/Nuclei/testssl findings

---

## Phase 10 — Stripe Billing
**Goal:** Full Stripe subscription flow — checkout → webhook → tier update.  
**Depends on:** Phase 2 only (can build any time after Phase 2)

- [ ] `server/services/billing/stripeService.js` — createCustomer, createCheckoutSession, createPortalSession
- [ ] `server/controllers/billingController.js` — createCheckout, createPortal, getSubscription
- [ ] `server/routes/billingRouter.js`
- [ ] `server/routes/webhookRouter.js` — POST /webhooks/stripe (raw body + signature verify)
  - Handle: `customer.subscription.created`, `updated`, `deleted`, `invoice.payment_failed`
- [ ] Wire billingRouter into `app.js`
- [ ] Wire webhookRouter BEFORE `express.json()` in `app.js` (raw body required)
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:5000/webhooks/stripe`

### Done When
Full payment flow works. Webhooks update `user.subscription`. Free vs premium limits enforced everywhere.

---

## Phase 11 — Security Hardening & Polish
**Goal:** Production-ready. Every endpoint audited.  
**Depends on:** All phases

- [ ] Audit: every endpoint has auth middleware ✓, Zod validation ✓, ownership check ✓, rate limit ✓
- [ ] Audit: no endpoint leaks password / token / internal fields
- [ ] Audit: httpOnly cookie on refresh token
- [ ] Audit: CORS not wildcard
- [ ] Audit: helmet config matches `docs/09_SECURITY_RULES.md`
- [ ] Verify all MongoDB indexes exist (run `db.collection.getIndexes()`)
- [ ] BullMQ worker concurrency set to 2
- [ ] Score engine unit tests
- [ ] Ownership check security tests
- [ ] README.md with setup instructions

---

## ✅ Completed Phases

_(move a phase block here when all tasks are checked)_

---

## 🔴 Blockers / Notes

- **macOS port 5000 conflict:** On this dev machine, macOS's built-in AirPlay Receiver (ControlCenter process) listens on port 5000 by default, which prevents the API server from binding there. Disable it via System Settings → General → AirDrop & Handoff → turn off "AirPlay Receiver", or run the server with a different `PORT` in your local `.env` during development. No code change was made since `PORT=5000` is correct per spec.
- **Docker Desktop not installed:** This machine uses `colima` (Homebrew) instead of Docker Desktop as the Docker runtime. `colima start` must be run before `docker compose`/`docker-compose` commands will work. Use `docker-compose` (standalone binary) rather than `docker compose` (plugin) — the compose plugin isn't installed for the `docker` CLI here.
