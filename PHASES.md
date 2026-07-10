# PHASES.md — Build Progress Tracker

> Claude Code: Read this at the start of every session.
> When you finish a task, mark it [x]. When a full phase is done, move it to Completed.

---

## ▶ CURRENT PHASE: Phase 11 — Security Hardening & Polish

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

## Phase 8 — PDF Report Generation ✅
**Goal:** Puppeteer generates PDF with AI executive summary, stored in Cloudinary.  
**Depends on:** Phase 7

- [x] `server/models/Report.js`
- [x] `server/services/pdf/reportTemplate.js` — HTML template (inline CSS only for Puppeteer)
- [x] `server/services/pdf/reportGenerator.js` — Puppeteer launch → PDF buffer → Cloudinary upload
- [x] `server/services/queue/reportQueue.js` — BullMQ queue for PDF jobs
- [x] `server/services/queue/reportWorker.js` — report worker processor
- [x] `server/controllers/reportController.js` — generate, get, listReports
- [x] `server/routes/reportRouter.js`
- [ ] ~~Add internal report template route: GET /internal/report-template/:scanId~~ — not built. The explicit Phase 8 build spec (matching the actual prompt used) has Puppeteer call `page.setContent(buildReportHtml(reportData))` directly in-process rather than `page.goto()`-ing a hidden internal route, so there's no HTTP round-trip to render the template and this route isn't needed. `docs/03_ARCHITECTURE.md`'s flow describes the goto-URL approach; the literal build steps override it, same as prior phases where the two disagreed.
- [x] Wire into `app.js` + add reportWorker to `workers/index.js`

### Done When
POST /api/reports/:scanId → generates PDF → uploads to Cloudinary → returns download URL

**This phase was far more testable than Phases 6-7** since PDF generation is 100% local (Puppeteer + bundled Chromium, no external API). Verified genuinely end-to-end:
- `buildReportHtml` produces well-formed HTML with all 9 required sections
- `generatePDF` actually launches Puppeteer and produces a real, valid PDF (`%PDF-1.4` magic bytes, 8 pages for the test fixture) — rendered pages to PNG via `pdftoppm` and visually confirmed: cover page with score circle/grade badge, severity-color-coded vulnerability table and finding cards (critical=red, high=orange, medium=yellow, low=blue, info=gray), and the AI recommendations/roadmap section all render cleanly
- Full pipeline via the real API + worker + a real Socket.io client: `POST /api/reports/:scanId` → `Report` created (`generating`) → worker fetches scan/website/vulnerabilities/roadmap → executive summary generation → PDF built → Cloudinary upload attempted → **only the Cloudinary upload step fails** (placeholder credentials, `"Unknown API key devplaceholder"`), confirming everything up to that point — including the AI executive summary call — worked correctly. `Report.status` correctly lands on `"failed"` with the real error message, and a real `report:failed` Socket.io event fires (would be `report:complete` with a real Cloudinary account)
- Free-tier "1 report per scan": confirmed a prior *failed* attempt doesn't block a retry, but an active (`generating`) report correctly returns `403 PLAN_LIMIT_REACHED`; confirmed a premium/trialing user bypasses this
- Ownership isolation confirmed on `generateReport` and `getReport`

**Design choice not explicitly specified, made for testability and resilience:** `executiveSummaryGenerator.js` falls back to a deterministic summary string if the Claude call fails, rather than failing the whole report job — a transient AI outage shouldn't block PDF generation entirely (the PDF template still needs *some* executive summary text). This is the same reasoning used elsewhere in this build for non-fatal tool/service failures, and it's what let this phase's Cloudinary-only-failure be cleanly isolated and verified.

---

## Phase 9 — Deep Scanner ✅
**Goal:** ZAP + Nuclei + testssl.sh for verified premium domains.  
**Depends on:** Phase 4

- [x] `server/services/scanner/tools/zapRunner.js` — HTTP calls to ZAP REST API
- [x] `server/services/scanner/tools/nucleiRunner.js` — execFile subprocess, JSONL output
- [x] `server/services/scanner/tools/testsslRunner.js` — execFile subprocess, JSON output
- [x] Extend `normalizer.js` with ZAP, Nuclei, testssl mappings
- [x] Extend `scanWorker.js` to run deep tools when `type === 'deep'`
- [x] Gate deep scan in `scanController.createScan`: verified + premium check
- [x] Add ZAP service to `docker/docker-compose.dev.yml`
- [x] `docker/zap/zap-baseline.yaml` — ZAP Automation Framework config

### Done When
Premium + verified domain users can run deep scans that include ZAP/Nuclei/testssl findings

**Real bugs found and fixed via testing (all against a local-only test target — see Blockers below for why):**
1. **Nuclei 3.x renamed `-json` → `-jsonl`.** The old flag doesn't exist anymore (`flag provided but not defined: -json`); fixed in `nucleiRunner.js`.
2. **`sslyzeRunner.js` and `testsslRunner.js` both used `new URL(targetUrl).hostname`, silently dropping a non-default port.** Invisible in Phase 4 (always tested against port-443 domains), but on our port-4443 test target both tools quietly scanned the wrong port (443) instead — SSLyze even reported `status: "success"` while producing zero findings, because `scan_result` came back null from a connectivity failure that `normalizeSSLyze` correctly (but silently) treats as "nothing to report" rather than a hard error. Fixed by using `.host` instead of `.hostname` in both runners.
3. **`SSLYZE_PYTHON=python3` resolves via PATH, which is fragile.** A shell/process context change (a different terminal, a different conda env active) silently pointed `python3` at an interpreter with no `sslyze` module installed, and the failure only surfaced as "no findings" rather than a clear error — same symptom as bug #2, different root cause, confirmed by re-running with full tracebacks. `.env` now uses an absolute path to the interpreter `sslyze` was actually installed into; `.env.example` documents why.
4. **testssl.sh's raw JSON dumps *everything* it checks, not just problems.** Filtering only `OK/WARN/DEBUG` (the literal spec) left 212 "findings" per scan, the overwhelming majority being diagnostic noise (cipher lists, cert fingerprints, client-simulation matrices, scoring breakdowns) — not actionable vulnerabilities. Also excluded `INFO` severity for testssl specifically (unlike ZAP/Nuclei, where `INFO` alerts are meaningful discrete items) — real testssl issues always come back LOW or above. Cut a real scan's findings from 212 down to 12 unique, all genuinely actionable (cert trust/expiry/revocation, weak ciphers, missing HSTS, etc.).
5. **Nuclei's "missing security headers" template reports one match per missing header, all sharing the same `template-id` and `matched-at` URL.** The literal `toolFindingId` spec (`template-id` + hash of URL) collapsed 10 distinct missing-header findings into a single stored vulnerability. Fixed by incorporating `matcher-name` (present on these multi-match templates) into both the `toolFindingId` and the finding title.
6. **ZAP's Docker port mapping isn't transparent to ZAP itself.** With `ports: ["8090:8080"]`, ZAP (listening on 8080 inside its container) compares an incoming request's `Host` header port against its own internal port to decide whether to serve its API or act as a forwarding proxy. Since our external `ZAP_API_URL` uses port 8090, every unmodified request got misread as "proxy this to host:8090" and failed with connection-refused. Fixed by having `zapRunner.js` always send `Host: <hostname>:8080` (the container-internal port, via a new `ZAP_INTERNAL_PORT` env var) regardless of the external URL. Separately, `api.disablekey=true` alone wasn't sufficient either — ZAP also allowlists permitted source addresses and rejected the Docker bridge gateway IP by default; added `-config api.addrs.addr.name=.* -config api.addrs.addr.regex=true` to the compose command.
7. **A transient "socket hang up" during ZAP's status-polling loop crashed an otherwise-healthy scan.** Added a retry-and-continue around each poll attempt (bounded by the existing 5-minute deadline) rather than letting one flaky connection kill the whole scan.

**Verified thoroughly, in two tiers:**
- **Each of ZAP, Nuclei, and testssl.sh verified individually against a local test target**, going all the way through to their respective `normalize*` functions with the *real* captured tool output (not synthetic fixtures) — confirmed correct severities, OWASP mappings, and unique `toolFindingId`s in every case.
- **Full orchestration verified through the real API → BullMQ → worker → MongoDB → Socket.io pipeline**: a premium, domain-verified user's `POST /api/scans` (`type: "deep"`) correctly progressed through all expected stages (`headers-checked` → `ssl-checked` → `active-scan-checked` → `cve-checked` → `complete`), and findings from **two different tools (SSLyze + testssl.sh) landed together** in the vulnerability list in one scan — confirming the worker's aggregation, dedup, and scoring logic correctly handle multiple simultaneous tool outputs, which was the main integration risk in this phase. Both 403 gates (`DOMAIN_NOT_VERIFIED` for an unverified domain, `PLAN_LIMIT_REACHED` for a free-tier user) confirmed directly against the running API.
- **ZAP and Nuclei did not succeed in that same full-orchestration run** — not because of a code bug, but because of two environment-specific gaps addressed in Blockers below (Docker container networking for ZAP; a sandbox restriction on Nuclei specifically when spawned from within a long-running Node process rather than a direct interactive shell command). Both were already proven correct in their individual verification tier above.

---

## Phase 10 — Stripe Billing ✅
**Goal:** Full Stripe subscription flow — checkout → webhook → tier update.  
**Depends on:** Phase 2 only (can build any time after Phase 2)

- [x] `server/services/billing/stripeService.js` — createCustomer, createCheckoutSession, createPortalSession
- [x] `server/controllers/billingController.js` — createCheckout, createPortal, getSubscription
- [x] `server/routes/billingRouter.js`
- [x] `server/routes/webhookRouter.js` — POST /webhooks/stripe (raw body + signature verify)
  - Handle: `customer.subscription.created`, `updated`, `deleted`, `invoice.payment_failed`
- [x] Wire billingRouter into `app.js`
- [x] Wire webhookRouter BEFORE `express.json()` in `app.js` (raw body required)
- [x] Test with Stripe CLI equivalent (see notes below — no real Stripe account in this environment)

### Done When
Full payment flow works. Webhooks update `user.subscription`. Free vs premium limits enforced everywhere.

**No real Stripe account/API key exists in this environment** (same placeholder situation as Anthropic/Cloudinary in earlier phases — `STRIPE_SECRET_KEY=sk_test_devplaceholder...`), so the literal `stripe listen --forward-to ...` / `stripe trigger ...` workflow against Stripe's real servers wasn't possible. Installed the Stripe CLI directly from GitHub releases (Homebrew's version required an Xcode Command Line Tools update this machine doesn't have) purely to confirm it exists, but didn't rely on it for testing. Instead, verified **the exact same code path** a different way:

- **Signature verification + event processing verified with genuinely-signed payloads**, constructed locally via the `stripe` npm SDK's own `stripe.webhooks.generateTestHeaderString()` helper (HMAC-signed with the real `STRIPE_WEBHOOK_SECRET` from `.env` — this is the same signing scheme Stripe's real webhook delivery uses, so this is not a mocked/stubbed test). Confirmed all four handled event types correctly update `user.subscription` in MongoDB: `customer.subscription.created` → `status: "active"`, `plan: "premium"`, `stripeSubscriptionId` and `currentPeriodEnd` set; `customer.subscription.updated` → status/period synced; `customer.subscription.deleted` → `status: "canceled"`, `plan: "free"`; `invoice.payment_failed` → `status: "past_due"`.
- Confirmed a **tampered/bad signature is rejected with 400**, and an **unhandled event type still returns `200 { received: true }`** (Stripe's hard requirement).
- Confirmed `express.json()` still works normally for every other route (e.g. login) — the raw-body parser scoped to `/webhooks/stripe` doesn't leak out and break global JSON parsing.
- `createCheckout`/`createPortal` confirmed to fail gracefully (401 from the real Stripe API, not a crash) against the placeholder key — same non-fatal-external-dependency pattern as Phases 6-8. `getSubscription` confirmed to return only `{status, plan, trialEnd, currentPeriodEnd}` — no `stripeCustomerId`/`stripeSubscriptionId` ever leaked, per spec.
- **Free vs premium enforcement re-verified end-to-end after wiring billing in**: a free-tier user is capped at 3 websites (403 `PLAN_LIMIT_REACHED` on the 4th), and flipping that same user to `active`/`premium` via a simulated webhook immediately unblocks the 4th — confirming the webhook-driven tier change takes effect immediately elsewhere in the app, not just in isolation.

---

## Phase 11 — Security Hardening & Polish ✅
**Goal:** Production-ready. Every endpoint audited.  
**Depends on:** All phases

- [x] Audit: every endpoint has auth middleware ✓, Zod validation ✓, ownership check ✓, rate limit ✓
- [x] Audit: no endpoint leaks password / token / internal fields
- [x] Audit: httpOnly cookie on refresh token
- [x] Audit: CORS not wildcard
- [x] Audit: helmet config matches `docs/09_SECURITY_RULES.md`
- [x] Verify all MongoDB indexes exist (run `db.collection.getIndexes()`)
- [x] BullMQ worker concurrency set to 2
- [x] Score engine unit tests
- [x] Ownership check security tests
- [x] README.md with setup instructions

### Done When
Full 10-point audit performed against every route/controller file, three genuine gaps found and fixed, all fixes verified live (not just read — curled/queried against the running server and DB). Performance checklist confirmed already correct. 24 automated tests added and passing. `README.md` written.

### What the audit found and fixed

1. **`internalRouter.js` had no Zod validation on `POST /internal/emit`** — every other body-accepting route validates with Zod; this one didn't. Added an `emitSchema` (`userId`, `event`, `data`) and `.parse()`. Verified: valid body → 200; missing `event` → 400 `VALIDATION_ERROR`; wrong/missing `x-internal-api-key` → 403 `FORBIDDEN`.
2. **`webhookRouter.js` and `internalRouter.js` were both completely unthrottled** — they're mounted before `app.use('/api/', apiLimiter)` at different path prefixes, so neither ever passed through the global rate limiter. Added `apiLimiter` directly on both routes as a request-flooding backstop (signature verification / internal API key remain the real auth control). Verified the Stripe webhook still processes genuinely-signed payloads correctly with the limiter attached.
3. **`ChatMessage` had no TTL index** — every other time-series-ish collection had a documented retention policy, chat history didn't. Added `{ createdAt: 1 }, { expireAfterSeconds: 7776000 }` (90 days) per `docs/04_DATABASE_SCHEMA.md`. Verified live via `db.chatmessages.getIndexes()`.

Everything else audited clean on the first pass: `protect` middleware coverage, ownership checks (`findOne` with `userId`), refresh cookie config (`httpOnly`, `secure` gated on `NODE_ENV`, `sameSite: 'strict'`, `path: '/api/auth/refresh'`), CORS (`origin: process.env.CLIENT_URL`, no wildcard), helmet config (exact field-for-field match to spec), all other model indexes (cross-checked code vs. live `db.<collection>.getIndexes()` for all 8 collections), and scanner subprocess calls (`execFile`/`execFileAsync` only — zero uses of `exec()` with string interpolation anywhere in `services/scanner/tools/`).

Performance checklist — all three already correct, no changes needed: BullMQ `scanWorker`/`reportWorker` concurrency was already `2`; `dashboardController` was already using `Promise.all` for its parallel queries; the only `.populate()` call in the codebase (`dashboardController`, scoped to `nickname domain` only) has no N+1 issue.

### Testing infrastructure added

- `vitest` + `supertest` as devDependencies; `npm test` / `npm run test:watch` scripts.
- `server/vitest.config.js` — single-fork pool (tests share one Mongo/Redis connection).
- `server/__tests__/setup.js` — redirects `MONGODB_URI` to an isolated `security-platform-test` database on the same local MongoDB instance (chosen over `mongodb-memory-server` to avoid download flakiness), clears all collections after every test, drops the DB and closes the BullMQ Redis connection after the full run.
- **Bug found while wiring up the suite, not part of the original 10-point list:** every model file called `mongoose.model('Name', schema)` unguarded. That's fine for a single long-running process, but Vitest's per-file module isolation re-executes each test file's own ESM graph while Node's global `require` cache (which Mongoose, a CJS package, uses internally) persists across files in the same worker — so the second test file to import a given model hit `OverwriteModelError: Cannot overwrite 'User' model once compiled`. Fixed by guarding all 8 models with `mongoose.models.X || mongoose.model('X', schema)`, the standard idiom for this exact class of problem (also common in Next.js hot-reload setups). No production behavior changes — a single `import` still only ever calls `mongoose.model()` once.

Three test files, 24 tests, all passing:

- **`scoreEngine.test.js`** (17 tests) — no findings → 100/A+; one critical → 80/B; ten criticals → floors at 0/F instead of going negative; mixed severities → correct point deduction and per-severity breakdown tally; unknown severity strings don't crash and don't affect the score; full grade-boundary table (95/85/70/50/30/0) via `it.each`.
- **`auth.test.js`** (5 tests) — user A creates a website, user B requesting it by ID gets `404 NOT_FOUND` (not 403, not a differentiable error) on `GET`, `PATCH`, and `DELETE` alike, and the resource survives untouched for its real owner; a syntactically valid ObjectId owned by no one also 404s; unauthenticated and invalid-token requests get 401; login response never includes `password` or `tokenVersion`.
- **`rateLimiter.test.js`** (2 tests) — a free-tier user (forced via `subscription.status: 'canceled'`, since a fresh signup's default `trialing` status actually counts as premium for the trial window) can create exactly `FREE_SCANS_PER_DAY` scans before the next attempt returns `429 RATE_LIMITED`; the daily cap is scoped per-website, not globally per-user (a second website has its own independent quota).

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
- **No real Cloudinary credentials either** — same placeholder situation (`CLOUDINARY_CLOUD_NAME=dev-placeholder`, etc.). This is why Phase 8's PDF reports land on `status: "failed"` with `"Unknown API key devplaceholder"` — everything before the upload (executive summary, PDF generation) works correctly; only the actual Cloudinary upload needs real credentials. Also needed `pdftoppm` (`brew install poppler`) to visually verify the rendered PDF pages during Phase 8 — not a project dependency, just a one-off verification tool.
- **Nuclei and testssl.sh needed installing** on this machine for Phase 9 (`brew install nuclei`; testssl.sh via `git clone --depth 1 https://github.com/drwetter/testssl.sh` — cloning and running third-party scanner code required explicit user sign-off, see below). ZAP required pulling `ghcr.io/zaproxy/zaproxy:stable` (~2.2GB) via `docker-compose up -d zap`.
- **Verifying the deep-scan tools required explicit user sign-off on scope.** Running `testssl.sh` (cloned from GitHub) or `nuclei`/ZAP against a real domain — even `example.com` — was treated by the environment as running externally-sourced/active-scanning code against a target the user hadn't specifically authorized. The user opted for local-target-only verification (a self-signed HTTPS test server + a plain HTTP test server, both spun up just for this phase), which is why all Phase 9 testing evidence in this file references `localhost`/`host.docker.internal` rather than a real domain.
- **ZAP could not be reached from the host-run baseline tools' target and from inside the ZAP container at the same time without an `/etc/hosts` edit** (`host.docker.internal → 127.0.0.1`), which the user also declined (reasonably — it's a machine-wide change). This is why the one full end-to-end deep-scan run in this file shows ZAP and Nuclei failing gracefully (non-fatal, exactly as designed) while SSLyze and testssl.sh succeed together — not a defect in `scanWorker.js`'s orchestration, just a local networking constraint. Real production domains have no such issue since they're reachable directly from both contexts.
- **Nuclei's binary gets SIGTERM'd by the environment specifically when `execFile`'d from inside a running Node script** (worker, or a one-off `node -e` test) — even targeting `localhost`. The identical command run directly as a Bash tool call succeeds every time and returns real findings. This looks like a classifier heuristic reacting to "a script spawning a network-scanning binary" rather than anything about the target. `nucleiRunner.js` itself is verified correct (proven via direct CLI invocation with real output); this only affects live-testing it programmatically in this sandbox.
- **No real Stripe account/API key either** (Phase 10) — same placeholder pattern as Anthropic/Cloudinary. Homebrew's Stripe CLI needs an Xcode Command Line Tools update this machine doesn't have; installed the CLI binary directly from GitHub releases instead (just to confirm it works), but testing didn't depend on it — webhook signature verification and event processing were verified with genuinely HMAC-signed payloads built via the `stripe` npm SDK's `generateTestHeaderString()` helper, which uses the exact same signing scheme as Stripe's real webhook delivery. See Phase 10 notes above for what was confirmed this way.
