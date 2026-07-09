# PHASES.md — Build Progress Tracker

> Claude Code: Read this at the start of every session.
> When you finish a task, mark it [x]. When a full phase is done, move it to Completed.

---

## ▶ CURRENT PHASE: Phase 8 — PDF Report Generation

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

## Phase 2 — Authentication ✅
**Goal:** register → verify email → login → refresh → logout → reset password, all working.  
**Depends on:** Phase 1

### Backend
- [x] `server/models/User.js` — full schema with subscription fields
- [x] `server/schemas/authSchemas.js` — Zod schemas for all auth endpoints
- [x] `server/services/email/emailService.js` — Resend/Nodemailer wrappers
- [x] `server/services/email/templates/verificationEmail.js`
- [x] `server/services/email/templates/passwordResetEmail.js`
- [x] `server/middleware/auth.js` — authenticateToken, authenticateInternal, checkSubscription, protect
- [x] `server/controllers/authController.js` — register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, getMe, updateMe, changePassword
- [x] `server/routes/authRouter.js`
- [x] Wire auth routes into `app.js`

**Verified end-to-end with curl** (see Blockers section for the local port note): register → DB-verified token → verify-email (confirmed one-time use) → login (identical "Invalid credentials" error for wrong password and unverified email) → refresh → PATCH /me → change-password (confirmed old refresh token + old password rejected after `tokenVersion` bump) → logout → forgot-password (identical generic response for existing/non-existent email) → reset-password (confirmed one-time use, confirmed login with new password).

Added beyond the original file list, needed to satisfy the spec: `cookie-parser` (to read the httpOnly refresh cookie in `refreshToken`) and `resend` (Resend SDK path in `emailService.js`) as new `server/package.json` dependencies; `tokenVersion` field on `User` (select:false) as the mechanism for "invalidate all refresh tokens" on password change/reset.

### Done When
- POST /api/auth/register → user created, verification email sent
- GET /api/auth/verify-email?token=xxx → emailVerified=true
- POST /api/auth/login → access token in body, refresh token in httpOnly cookie
- POST /api/auth/refresh → new access token
- POST /api/auth/logout → cookie cleared
- POST /api/auth/forgot-password → reset email sent
- POST /api/auth/reset-password → password updated

---

## Phase 3 — Website Management ✅
**Goal:** Users can add websites, verify domain ownership, manage their list.  
**Depends on:** Phase 2

### Backend
- [x] `server/models/Website.js`
- [x] `server/schemas/websiteSchemas.js` — create, update, list schemas
- [x] `server/utils/urlNormalizer.js` — strip path/port, force https
- [x] `server/utils/tokenGenerator.js` — generate `sav-verify-{uuid}` token
- [x] `server/services/verification/dnsVerifier.js` — dns.promises.resolveTxt()
- [x] `server/services/verification/metaTagVerifier.js` — fetch + cheerio parse
- [x] `server/controllers/websiteController.js` — list, create, get, update, delete, initiateVerification, checkVerification
- [x] `server/routes/websiteRouter.js`
- [x] Wire website routes into `app.js`

### Done When
- POST /api/websites creates website with verificationToken
- POST /api/websites/:id/verify checks DNS TXT or meta tag and sets verified=true
- Free tier cannot add more than 3 websites

**Verified end-to-end with curl + a local mock HTTP server:** create (URL normalization confirmed: path/query/case stripped, https forced), ownership isolation (another user's website → 404), duplicate-domain rejection (409, case/scheme/path-insensitive), get/update/soft-delete, `GET .../verify` (instructions) and `POST .../verify` (actual check). `verifyMetaTag` and `verifyDns` were also unit-verified directly (match / mismatch / unreachable-or-no-record cases) since exercising a real positive DNS TXT match requires owning a domain — confirmed via a monkey-patched `dns.promises.resolveTxt`. Free-tier limit confirmed to correctly cap at 3 for a genuinely free (non-trialing) user; note that trialing users are intentionally treated as premium-equivalent by `isPremium()` per the 14-day-full-access rule in `docs/01_PLATFORM_OVERVIEW.md` (F14), so the cap only bites once trial/premium status is gone — this is expected, not a bug.

---

## Phase 4 — Baseline Scanner (Core) ✅
**Goal:** End-to-end async scan: trigger → queue → worker → normalize → DB → Socket.io event.  
**Depends on:** Phase 3  
**NOTE: Most complex phase — build step by step.**

### Models
- [x] `server/models/Scan.js`
- [x] `server/models/Vulnerability.js`
- [x] `server/models/ScanRateLimit.js`

### Scanner Tools + Services
- [x] `server/services/queue/scanQueue.js` — BullMQ Queue definition + enqueueScan()
- [x] `server/services/scanner/tools/observatoryRunner.js`
- [x] `server/services/scanner/tools/sslyzeRunner.js`
- [x] `server/services/scanner/normalizer.js` — Observatory + SSLyze output → unified finding
- [x] `server/services/scoring/scoreEngine.js` — deterministic score calculation

### Worker (separate process)
- [x] `server/services/queue/scanWorker.js` — full processor: run tools → normalize → deduplicate → score → save → emit
- [x] `server/workers/index.js` — worker entry point

### API + Socket.io
- [x] `server/schemas/scanSchemas.js`
- [x] `server/controllers/scanController.js` — createScan, getScan, listScansForWebsite, getFindings
- [x] `server/controllers/vulnerabilityController.js` — list (filters), get, update, stats
- [x] `server/routes/scanRouter.js`
- [x] `server/routes/vulnerabilityRouter.js`
- [x] `server/routes/internalRouter.js` — POST /internal/emit (internal API key auth)
- [x] Wire all routes into `app.js`

### Done When
- POST /api/scans returns `{ scanId, status: "queued" }`
- Worker picks up job, runs Observatory + SSLyze
- Socket.io emits scan:progress and scan:complete to frontend
- Vulnerabilities saved with correct severity + OWASP mapping
- Score and grade stored on Scan document
- Free tier capped at 3 scans/day/website

**Verified end-to-end** with a real API server + worker process + a real Socket.io client connected over the network, scanning the live `example.com`: `POST /api/scans` → `queued` → worker picks it up → `scan:progress` fires 3 times (5% → 50% → 80%) → `scan:complete` fires with `{score: 63, grade: "C"}` → 6 vulnerabilities saved with correct OWASP mapping → re-scanning the same site produced **no duplicate vuln records** (still 6, with `lastSeenAt`/`lastCheckedScanId` updated on the existing docs) → a planted "fixed" vuln not redetected on re-scan correctly flipped to `verified` with `resolvedAt` set → a genuinely free-tier user's 4th scan of the day got `429 RATE_LIMITED` → a `deep` scan on an unverified domain got `403 DOMAIN_NOT_VERIFIED` → vulnerability status-transition validation confirmed (`verified` is unreachable via the API; only the worker sets it).

**Two real-world tool/package issues found and fixed, not anticipated by docs/06:**
1. **`mdn-http-observatory` doesn't exist on npm** — the real package is `@mdn/mdn-http-observatory`. Installing it pulled in `http-cookie-agent@7.0.4`, which `require()`s `agent-base@9.x` (a pure-ESM package) and crashes with `ERR_REQUIRE_ESM` on import. Fixed with an `overrides` entry in `server/package.json` pinning `agent-base` to `^6.0.2` for that dependency. Separately, the package's `scan()` function in this current version takes a `Site` instance (`Site.fromSiteString(hostname)`), not a raw hostname string as the docs snippet shows — passing a raw string silently produces `https://undefined` requests and fails with "the site seems to be down". Both are fixed in `observatoryRunner.js`.
2. **SSLyze 6.x (the version `pip install sslyze` gives you today) removed the `--regular` CLent flag** the docs use. Replaced with `--mozilla_config=intermediate`, which queues an equivalent standard set of checks and was verified to produce the documented JSON shape. Also had to install `sslyze` via `pip3 install sslyze` and confirm `python3` was on PATH — neither was present in a fresh environment.

Also added `API_INTERNAL_URL` env var (worker → API base URL for `/internal/emit`) — needed for the worker/API split to work but not listed in `docs/08_ENV_AND_SECRETS.md`.

---

## Phase 5 — Dashboard & Analytics ✅
**Goal:** Dashboard API returns all chart data in one call.  
**Depends on:** Phase 4

- [x] `server/controllers/dashboardController.js` — getSummary (parallel queries with Promise.all)
- [x] `server/routes/dashboardRouter.js`
- [x] Wire into `app.js`
- [x] Verify all MongoDB indexes from `docs/04_DATABASE_SCHEMA.md` exist

### Done When
GET /api/dashboard/summary returns: totalWebsites, totalScans, openVulnerabilities, averageScore, scoreHistory, recentScans, riskDistribution

**Verified end-to-end** with seeded test data (3 websites, 48 completed scans, 27 open vulnerabilities): every field returned correct values (`averageScore: 90` matching the average of each website's latest score 95/90/85; `riskDistribution` summing to `openVulnerabilities`; `scoreHistory` correctly ordered oldest→newest per website for line charts; `websitesSummary`/`recentScans` correctly populated). Response time was **~55ms** (well under the 500ms budget) with seeded data, and **~9ms** for a brand-new user with zero data — confirmed the empty-state case doesn't crash the aggregations (`averageScore` correctly comes back `null`, not `NaN`).

**Index audit found two gaps** in the existing models vs. `docs/04_DATABASE_SCHEMA.md` and fixed them: `Website` was missing a standalone `verificationToken` index, and `Scan` was missing a standalone `{status: 1}` index (used for finding queued/running scans). Both added; `db.<collection>.getIndexes()` confirmed all docs/04-specified indexes now exist on disk for `users`, `websites`, `scans`, and `vulnerabilities`.

Note: `GET /api/dashboard/summary` is mounted as `router.get('/summary', ...)` under `app.use('/api/dashboard', dashboardRouter)` — the phase prompt said "GET / → getSummary" but the literal Done-When path (and docs/05) is `/api/dashboard/summary`, so the route was named to match the tested/documented URL.

---

## Phase 6 — AI Security Assistant ✅
**Goal:** Context-aware chat with Claude API, rate-limited, scan context attachable.  
**Depends on:** Phase 4

- [x] `server/models/ChatMessage.js`
- [x] `server/services/ai/promptBuilder.js` — builds system prompt with scan context + OWASP definitions
- [x] `server/services/ai/assistant.js` — Claude API call with prompt caching
- [x] `server/controllers/chatController.js` — sendMessage, getHistory, clearHistory
- [x] `server/routes/chatRouter.js`
- [x] Wire into `app.js`

### Done When
POST /api/chat with optional scanId → AI response with "AI-Assisted Guidance" label
Rate limit: 20 messages/day free, 200/day premium

**Verified everything except the live Claude response** (no real `ANTHROPIC_API_KEY` is available in this environment — `.env` only has the format-valid placeholder from Phase 1). Confirmed instead:
- `promptBuilder.js` output directly: base prompt + OWASP Top 10 block always present; with a scan attached, the "Active Scan Context" block appears with correct score/grade/findings, top-15 truncation, and "...and N more findings" — verified with 18 seeded findings.
- The `scanId` code path runs end-to-end without error for both a real owned scan and a nonexistent/foreign scanId (silently no-context, doesn't fail the request) — both reach the same point (the actual Anthropic call) before failing only on auth.
- Daily rate limiting: seeded 20 "user"-role `ChatMessage` docs for a genuinely free-tier user, confirmed the 21st request is rejected with `429 RATE_LIMITED` **before** it ever calls the AI (fails inside `chatController.js`, not `assistant.js`) — and confirmed a failed AI call never gets persisted to `ChatMessage`, so outages can't silently burn a user's daily quota.
- `getHistory` (oldest-first, last 30) and `clearHistory` (deletes all for the user) both confirmed against seeded data.
- Content validation (max 2000 chars) confirmed rejecting oversized input with `400 VALIDATION_ERROR`.

**Real bug found via direct SDK testing, fixed:** the Anthropic SDK's thrown error nests the actual API error type two levels deep — `err.error.error.type`, not `err.error.type`. The original code (matching a literal reading of docs/15's error-mapping snippet) read the wrong level, so it would always see the literal string `"error"` and silently fall through to the generic default message for every failure type, defeating the whole point of mapping `overloaded_error`/`rate_limit_error`/etc. to specific user-facing messages. Fixed the extraction path and confirmed (via a direct Anthropic SDK call with the placeholder key) that the real API returns `authentication_error` for a bad key — not `invalid_api_key` as docs/15 assumes — so that key was added to the mapping too, alongside the documented one.

Note: per the explicit Phase 6 spec (not docs/04's `chatmessages` schema, which uses `sessionId`-scoped conversations with a 90-day TTL), this implementation has no `sessionId` — it's one continuous per-user chat log, and `getHistory`/`clearHistory` operate on the whole user history rather than a session. `DELETE /api/chat/history` (no `:sessionId` param) was used instead of docs/05's `DELETE /api/chat/session/:sessionId` for consistency with that design.

---

## Phase 7 — AI Roadmap Generator ✅
**Goal:** Claude generates a week-by-week remediation plan from scan findings, stored in DB.  
**Depends on:** Phase 6

- [x] `server/models/Roadmap.js`
- [x] `server/services/ai/roadmapGenerator.js` — Claude API → parse JSON roadmap
- [x] `server/controllers/roadmapController.js` — generate, get, updateStep
- [x] `server/routes/roadmapRouter.js`
- [x] Wire into `app.js`

### Done When
POST /api/roadmaps/:scanId generates and returns a structured roadmap with week-by-week steps

**Real bug found and fixed before any API testing:** `parseRoadmapResponse`'s fence-stripping ran `.trim()` *after* the `^`/`$`-anchored regex replacements instead of before. Any Claude response with leading/trailing whitespace around a ` ```json ` fence (very plausible) would silently fail to strip it, since the anchors wouldn't match past the whitespace, and `JSON.parse` would then throw on the raw fenced text. Caught by testing the exact stripping logic against fenced/whitespace-padded inputs before wiring up the controller — fixed by moving `.trim()` to run first.

**Verified end-to-end without a real Claude response** (same `ANTHROPIC_API_KEY` limitation as Phase 6): confirmed the full failure path — `POST /api/roadmaps/:scanId` creates a `Roadmap` doc, the AI call fails cleanly with `503 AI_UNAVAILABLE`, and the doc is correctly persisted as `status: "failed"` with the error message (not left stuck as `"generating"`). Confirmed retrying a failed roadmap regenerates in place (same document, unique `scanId` index holds — no duplicate created), while re-requesting an already-`"completed"` roadmap short-circuits and returns the existing one without calling the AI again. Seeded a realistic completed roadmap **through the actual Mongoose model** (not raw `mongosh`, which — instructive gotcha — doesn't persist subdocument `_id`s the way Mongoose does, so a raw-inserted `steps` array gets a *new, unstable* `_id` regenerated on every hydration; going through `Roadmap.create()` gives each step a real, stable `_id` as production code would) and confirmed `PATCH /api/roadmaps/:roadmapId/steps/:stepId` correctly toggles `isDone` both directions with `completedAt` set/cleared accordingly. Ownership isolation confirmed on both `getRoadmap` and `updateStep` (404 for another user's scan/roadmap).

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
- **SSLyze is a system Python dependency, not an npm package:** `pip3 install sslyze` must be run (with `python3` on PATH) before baseline scans can use it — it was not present on this machine and had to be installed. Also note SSLyze 6.x dropped the `--regular` CLI flag docs/06 references; `sslyzeRunner.js` now uses `--mozilla_config=intermediate` instead (see Phase 4 notes above for details).
- **`@mdn/mdn-http-observatory` needed an `overrides` pin** (`agent-base` → `^6.0.2` under `http-cookie-agent`) in `server/package.json` to avoid an `ERR_REQUIRE_ESM` crash from a broken transitive dependency combo. If you ever remove/upgrade this package, re-check whether the override is still needed.
- **No real `ANTHROPIC_API_KEY` is configured** — `.env` only has the Phase 1 placeholder (`sk-ant-devplaceholder...`, format-valid so `validateEnv()` passes, but rejected by the real API). Everything in Phase 6 was verified except an actual Claude response (see Phase 6 notes for what was verified instead). Drop a real key into `server/.env` to get live AI replies from `/api/chat/message`.
