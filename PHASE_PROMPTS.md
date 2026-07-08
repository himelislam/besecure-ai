# Phase Prompts — Copy-Paste Into Claude Code

**How to use:**
1. Open VS Code in the project root
2. Open Claude Code (Ctrl+Shift+P → "Claude Code")
3. For each phase, copy the prompt exactly and paste it into Claude Code
4. Let Claude Code finish completely before moving to the next phase
5. Test the "Done When" condition before continuing
6. After each phase, update `PHASES.md` — mark tasks done

**One phase per session.** Don't mix phases in the same conversation.

---

---

## PHASE 1 — Foundation

```
Read CLAUDE.md and PHASES.md first.

Build Phase 1 — Foundation. Create all files listed in the Phase 1 checklist in PHASES.md.

Specifically:
- server/package.json (all backend dependencies from docs/02_TECH_STACK.md — exact versions listed there)
- server/.env.example (all env variable keys from docs/08_ENV_AND_SECRETS.md — no real values)
- server/config/validateEnv.js — Zod schema validates all required env vars on startup, calls process.exit(1) if invalid
- server/config/db.js — Mongoose connect with reconnect logic, logs state changes
- server/config/redis.js — ioredis singleton + separate bullMQConnection export (maxRetriesPerRequest: null required for BullMQ)
- server/config/cloudinary.js — Cloudinary SDK init, warns if not configured
- server/config/stripe.js — Stripe SDK init, returns null if not configured
- server/config/socket.js — Socket.io init, JWT auth middleware on connections, emitToUser() helper, users join room "user:{userId}"
- server/utils/AppError.js — class AppError extends Error with statusCode, code, isOperational. Include ErrorCodes object.
- server/utils/logger.js — Winston logger, scrubs SENSITIVE_FIELDS from all log output (password, token, secret, key, authorization, cookie)
- server/middleware/errorHandler.js — handles: AppError, Mongoose ValidationError, CastError, duplicate key 11000, JWT errors, ZodError, everything else → 500 (no stack in production)
- server/middleware/rateLimiter.js — authLimiter (5/15min), apiLimiter (100/1min keyed by userId or IP), strictLimiter (3/1hr)
- server/app.js — helmet (all security headers from docs/09_SECURITY_RULES.md), cors (CLIENT_URL only, no wildcard), morgan (dev only), express.json(), apiLimiter on /api/, mount routes, notFound + errorHandler last
- server/server.js — creates http.Server, calls initSocket(), connectDB(), getRedisClient(), initCloudinary(), listens on PORT, graceful SIGTERM/SIGINT shutdown, unhandledRejection + uncaughtException handlers
- server/routes/healthRouter.js — GET /api/health, checks mongoose.connection.readyState and redis.ping(), returns services status
- docker/docker-compose.dev.yml — MongoDB 7 + Redis 7-alpine, ports 27017 and 6379 exposed to localhost only

Rules:
- ESM only (import/export), no require()
- All files use async/await
- Follow docs/09_SECURITY_RULES.md for helmet config exactly
- Follow docs/10_COMMON_PATTERNS.md for AppError and logger patterns

After creating all files, run: npm install in /server and verify server starts with npm run dev.

Done when: curl http://localhost:5000/api/health returns { success: true, data: { status: "ok", services: { mongodb: "ok", redis: "ok" } } }
```

---

## PHASE 2 — Authentication

```
Read CLAUDE.md and PHASES.md. Phase 1 is complete. Now build Phase 2 — Authentication.

Reference files to read first:
- docs/04_DATABASE_SCHEMA.md — User collection schema (all fields)
- docs/05_API_REFERENCE.md — all /api/auth/* endpoint specs
- docs/08_ENV_AND_SECRETS.md — JWT and email env vars
- docs/09_SECURITY_RULES.md — bcrypt rounds, cookie settings, same error for wrong credentials
- docs/10_COMMON_PATTERNS.md — controller pattern, Axios interceptor, Zustand auth store

Build these files in order:

BACKEND:
1. server/models/User.js
   - Full schema: name, email, password (select:false), emailVerified, emailVerificationToken (select:false), passwordResetToken (select:false), passwordResetExpires (select:false), avatar, subscription (plan, status, trialEnd, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd), lastLoginAt
   - subscription.status default: 'trialing', trialEnd: now + TRIAL_DAYS
   - Pre-save hook: bcrypt.hash(password, 12) — must be 12 rounds
   - Instance method: comparePassword(candidatePassword)
   - Instance method: isPremium() — checks active or trialing within trialEnd
   - toJSON transform: removes password, token fields, stripeIds
   - Indexes: email (unique), stripeCustomerId, emailVerificationToken, passwordResetToken

2. server/schemas/authSchemas.js
   - registerSchema: name (trim, max 100), email (email, lowercase), password (min 8, max 128)
   - loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema, changePasswordSchema, updateProfileSchema

3. server/services/email/emailService.js
   - If RESEND_API_KEY set: use Resend SDK
   - Else: use Nodemailer with SMTP env vars
   - Functions: sendVerificationEmail(to, name, token), sendPasswordResetEmail(to, name, token)
   - Never log email content or tokens

4. server/services/email/templates/verificationEmail.js — HTML email with verify link: CLIENT_URL/verify-email?token=TOKEN
5. server/services/email/templates/passwordResetEmail.js — HTML email with reset link: CLIENT_URL/reset-password?token=TOKEN

6. server/middleware/auth.js
   - authenticateToken: checks Authorization: Bearer header, verifies JWT_ACCESS_SECRET, fetches user (exclude sensitive fields), checks emailVerified
   - authenticateInternal: checks x-internal-api-key header matches INTERNAL_API_KEY
   - checkSubscription: attaches req.tier ('free'|'premium') based on subscription.status and trialEnd
   - protect: [authenticateToken, checkSubscription] combined export

7. server/controllers/authController.js — implement all functions:
   - register: validate with registerSchema, check email not taken, create user, create Stripe customer async (non-blocking, don't await), send verification email, return { message: "Check your email" }
   - verifyEmail: find user by emailVerificationToken, set emailVerified=true, CLEAR the token (one-time use)
   - login: find by email, comparePassword, SAME error for wrong password AND unverified email ("Invalid credentials" — never reveal which), set lastLoginAt, issue access token (15min), set refresh cookie (httpOnly, secure, sameSite:strict, path:/api/auth/refresh, 7days)
   - refreshToken: read cookie, verify JWT_REFRESH_SECRET, issue new access token
   - logout: clear refresh token cookie
   - forgotPassword: find user, generate reset token (jwt.sign with JWT_EMAIL_SECRET, 24h), save to passwordResetToken + passwordResetExpires, send email, return generic success message
   - resetPassword: verify token, update password, CLEAR passwordResetToken + passwordResetExpires
   - getMe: return req.user (no sensitive fields)
   - updateMe: updateProfileSchema.parse(req.body), update name/avatar
   - changePassword: verify currentPassword with comparePassword, update to newPassword, clear all refresh tokens (set a tokenVersion field or similar strategy)

8. server/routes/authRouter.js
   - Apply authLimiter to: POST /register, POST /login, POST /forgot-password
   - Apply strictLimiter to: POST /reset-password
   - Apply protect middleware to: GET /me, PATCH /me, POST /change-password, POST /logout

9. In server/app.js: uncomment/add the auth routes line

Security requirements (from docs/09_SECURITY_RULES.md):
- bcrypt cost 12, never lower
- Refresh token cookie: httpOnly: true, secure: NODE_ENV=production, sameSite: 'strict', path: '/api/auth/refresh'
- Never return password field in any response
- Same error message for wrong password AND unverified email
- Email tokens are one-time use — clear after use

Done when: Full auth flow works end-to-end tested with curl or Postman.
```

---

## PHASE 3 — Website Management

```
Read CLAUDE.md and PHASES.md. Phases 1 and 2 are complete. Build Phase 3 — Website Management.

Reference files:
- docs/04_DATABASE_SCHEMA.md — websites collection
- docs/05_API_REFERENCE.md — /api/websites/* endpoints
- docs/01_PLATFORM_OVERVIEW.md — F02 feature spec, verification methods
- docs/10_COMMON_PATTERNS.md — ownership check pattern, controller pattern

Build in this order:

1. server/models/Website.js
   - Fields: userId (ref User, index), url (normalized), domain (hostname only), nickname, verified (default:false), verificationToken, verificationMethod (dns|meta_tag|null), verifiedAt, lastVerificationAttempt, verificationAttempts, lastScanAt, lastScanId, lastScore, lastGrade, isDeleted (default:false), deletedAt
   - Compound unique index: { userId: 1, domain: 1 }
   - Index: { userId: 1, isDeleted: 1 }
   - Instance method: getVerificationInstructions() — returns { token, dns: { type, host, value }, metaTag: { tag, placement } }

2. server/schemas/websiteSchemas.js
   - createWebsiteSchema: url (z.string().url(), transform to normalize: new URL(url) → "https://" + hostname.toLowerCase()), nickname (trim, min 1, max 100)
   - updateWebsiteSchema: nickname only, .strict()
   - Also export extractDomain(url) utility

3. server/utils/urlNormalizer.js — normalizeUrl(rawUrl): returns "https://hostname" (strips path, port, trailing slash, forces https, lowercases)
4. server/utils/tokenGenerator.js — generateVerificationToken(): returns "sav-verify-" + crypto.randomUUID()

5. server/services/verification/dnsVerifier.js
   - Uses dns.promises.resolveTxt()
   - Checks for TXT record on _security-audit-verify.{domain}
   - Returns { verified: bool, record: string|null }

6. server/services/verification/metaTagVerifier.js
   - Uses node-fetch to GET the homepage
   - Uses cheerio to parse HTML, find <meta name="security-audit-verify">
   - Returns { verified: bool, content: string|null }
   - Timeout: 10 seconds on the fetch

7. server/controllers/websiteController.js
   - listWebsites: find({ userId, isDeleted:false }), paginate, sort by createdAt desc
   - createWebsite: validate with createWebsiteSchema, normalizeUrl, extractDomain, check free tier limit (MAX_WEBSITES_FREE), check duplicate domain for this user, generate verificationToken, create website
   - getWebsite: ownership check (findOne({ _id, userId })), 404 if not found
   - updateWebsite: ownership check, updateWebsiteSchema.parse, update nickname only
   - deleteWebsite: ownership check, set isDeleted=true + deletedAt=now (soft delete)
   - initiateVerification: ownership check, return website.getVerificationInstructions()
   - checkVerification: ownership check, run dnsVerifier AND metaTagVerifier, if either passes → set verified=true + verificationMethod + verifiedAt, increment verificationAttempts either way

8. server/routes/websiteRouter.js — all routes under protect middleware (authenticateToken + checkSubscription)
9. In server/app.js: add website routes

Done when:
- POST /api/websites creates website with verificationToken "sav-verify-..."
- POST /api/websites/:id/verify returns { verified: true } after DNS or meta tag check passes
- 4th website creation returns 403 PLAN_LIMIT_REACHED for free tier users
```

---

## PHASE 4 — Baseline Scanner

```
Read CLAUDE.md and PHASES.md. Phases 1-3 complete. Build Phase 4 — Baseline Scanner.
This is the most complex phase. Read docs/06_SCANNER_INTEGRATION.md carefully first.

Also read:
- docs/04_DATABASE_SCHEMA.md — scans and vulnerabilities collections
- docs/05_API_REFERENCE.md — /api/scans and /api/vulnerabilities endpoints
- docs/10_COMMON_PATTERNS.md — BullMQ job pattern, Socket.io event pattern

Build in this exact order:

STEP 1 — Models:
1. server/models/Scan.js — fields: userId, websiteId, type (baseline|deep), targetUrl, status (queued|running|completed|failed), progress (0-100), progressMessage, error, startedAt, completedAt, durationMs, score, grade, findingCounts ({critical,high,medium,low,info}), toolsRun ([{name,status,durationMs,error}]), isDeleted. Indexes: {websiteId,createdAt:-1}, {userId,createdAt:-1}
2. server/models/Vulnerability.js — all fields from docs/04_DATABASE_SCHEMA.md including: userId, websiteId, scanId, title, description, severity, category, owaspCategory, owaspTitle, evidence, affectedUrl, recommendation, references[], detectedBy (observatory|sslyze|testssl|zap|nuclei|custom), toolFindingId, status (open|assigned|in_progress|fixed|verified|closed|false_positive), priority, notes[], assignedTo, firstSeenAt, lastSeenAt, resolvedAt, lastCheckedScanId, isDeleted. Export VALID_STATUS_TRANSITIONS object. Indexes: {websiteId,status,severity}, {userId,status}, {scanId}, {websiteId,toolFindingId}
3. server/models/ScanRateLimit.js — fields: userId, websiteId, date (YYYY-MM-DD string), scanCount, expiresAt. Static methods: incrementAndGet(userId, websiteId), getTodayCount(userId, websiteId). Unique index: {userId,websiteId,date}. TTL index on expiresAt.

STEP 2 — Queue:
4. server/services/queue/scanQueue.js — BullMQ Queue with bullMQConnection, defaultJobOptions (attempts:1, removeOnComplete, removeOnFail, timeout). Export: scanQueue, enqueueScan(scanId, jobData) uses jobId=scanId to prevent duplicate queuing

STEP 3 — Scanner Tools:
5. server/services/scanner/tools/observatoryRunner.js — dynamic import of 'mdn-http-observatory', call scan(targetUrl), timeout 30s with Promise.race, return raw result + _durationMs
6. server/services/scanner/tools/sslyzeRunner.js — run Python subprocess: execFile(process.env.SSLYZE_PYTHON, ['-m', 'sslyze', '--json_out=-', '--regular', hostname], timeout 60s), parse stdout JSON, return parsed result + _durationMs. Extract hostname from targetUrl with new URL(targetUrl).hostname.

STEP 4 — Normalizer + Score Engine:
7. server/services/scanner/normalizer.js — maps Observatory tests object and SSLyze server_scan_results to unified finding shape: { toolFindingId, title, description, severity, category, owaspCategory, owaspTitle, evidence, affectedUrl, recommendation, references[], detectedBy }. Include OWASP_CATEGORIES lookup table. Map: content-security-policy, strict-transport-security, x-frame-options, x-content-type-options, referrer-policy, cookies, redirection, subresource-integrity. For SSLyze: certificate trusted, certificate expiry (<0 days=critical, <30 days=medium), SSL 2.0/3.0 (critical), TLS 1.0/1.1 (high).
8. server/services/scoring/scoreEngine.js — calculateScore(findings) returns {score, grade, breakdown}. Deductions: critical -20, high -10, medium -5, low -2, info -0. Floor 0. Grades: 95+=A+, 85+=A, 70+=B, 50+=C, 30+=D, 0+=F. Export: calculateScore, getGrade, estimateScoreAfterFix.

STEP 5 — Worker:
9. server/services/queue/scanWorker.js — BullMQ Worker with concurrency 2.
   processScan(job) must:
   - Update Scan status to 'running' + startedAt
   - Emit scan:progress via POST /internal/emit with x-internal-api-key header
   - Run observatoryRunner — wrap in try/catch (non-fatal if fails)
   - Emit progress update (50%)
   - Run sslyzeRunner — wrap in try/catch (non-fatal if fails)
   - Emit progress update (80%)
   - Call normalizeObservatory + normalizeSSLyze → combine allFindings
   - Deduplicate: for each finding check Vulnerability.findOne({websiteId, toolFindingId}). If exists: update lastSeenAt + scanId. If not: create new.
   - Auto-verify: find vulns with status='fixed' for this website. If their toolFindingId is NOT in allFindings → update status to 'verified', set resolvedAt.
   - calculateScore(allFindings) → score, grade, breakdown
   - Update Scan: status=completed, score, grade, findingCounts, toolsRun, completedAt, durationMs
   - Update Website: lastScanAt, lastScanId, lastScore, lastGrade
   - Emit scan:complete event
   Worker .on('failed'): update Scan status=failed, emit scan:failed
   Export: createScanWorker()

10. server/workers/index.js — entry point: validateEnv, connectDB, createScanWorker(), graceful shutdown

STEP 6 — API:
11. server/schemas/scanSchemas.js — createScanSchema (websiteId, type), listScansSchema, listVulnerabilitiesSchema (filters: websiteId, scanId, status, severity, owaspCategory, sortBy, sortOrder), updateVulnerabilitySchema (status, priority, note — at least one required)

12. server/controllers/scanController.js:
   - createScan: validate, ownership check on website, check scan rate limit (ScanRateLimit.getTodayCount, compare to FREE_SCANS_PER_DAY for free tier), check if type=deep requires verified+premium (throw 403 if not), create Scan document (status:queued), ScanRateLimit.incrementAndGet, enqueueScan(scan._id, {...}), return { scanId, status: "queued" }
   - getScan: ownership check, return scan
   - listScansForWebsite: ownership check on website, paginated scans for that website
   - getScanFindings: ownership check on scan, paginated vulnerabilities for that scan

13. server/controllers/vulnerabilityController.js:
   - listVulnerabilities: filter by userId + optional websiteId/scanId/status/severity/owaspCategory, paginate, sort
   - getVulnerability: ownership check
   - updateVulnerability: ownership check, validate with updateVulnerabilitySchema, validate status transition using VALID_STATUS_TRANSITIONS, if new note: push to notes[], if status=fixed: set resolvedAt=now, save
   - getVulnerabilityStats: aggregate counts by severity and status for userId

14. server/routes/internalRouter.js — POST /internal/emit: authenticateInternal middleware, call emitToUser(data.userId, data.event, data) using getIO() from config/socket.js
15. server/routes/scanRouter.js
16. server/routes/vulnerabilityRouter.js
17. Update server/app.js to mount all new routes. Mount /internal OUTSIDE of apiLimiter.

Done when:
- POST /api/scans returns { success:true, data:{ scanId, status:"queued" } }
- npm run worker (separate terminal) picks up job
- Socket.io emits scan:progress events during processing
- Socket.io emits scan:complete with score + grade when done
- Vulnerabilities are saved in DB with correct OWASP mapping
- Re-running scan on same website deduplicates (no duplicate vuln records)
- Free user hitting 4th scan in a day gets 429 RATE_LIMITED
```

---

## PHASE 5 — Dashboard & Analytics

```
Read CLAUDE.md and PHASES.md. Phases 1-4 complete. Build Phase 5 — Dashboard & Analytics.

Reference: docs/05_API_REFERENCE.md — GET /api/dashboard/summary endpoint spec

Build:
1. server/controllers/dashboardController.js — getSummary function:
   All queries scoped to req.user._id. Use Promise.all for parallel execution. Return:
   - totalWebsites: Website.countDocuments({ userId, isDeleted:false })
   - totalScans: Scan.countDocuments({ userId, isDeleted:false, status:'completed' })
   - openVulnerabilities: Vulnerability.countDocuments({ userId, status:'open', isDeleted:false })
   - averageScore: aggregate Scan to get avg of latest score per website
   - scoreHistory: for each website, last 10 completed scans (date + score) — used for line chart
   - recentScans: last 5 completed scans with website nickname populated
   - riskDistribution: Vulnerability.aggregate groupBy severity, count where status:'open' and userId matches
   - websitesSummary: all websites with lastScore, lastGrade, lastScanAt, openVulnCount per website

2. server/routes/dashboardRouter.js — GET / → protect middleware → getSummary
3. In server/app.js: mount at /api/dashboard

Performance: verify all indexes in docs/04_DATABASE_SCHEMA.md exist by checking each model file.

Done when: GET /api/dashboard/summary returns all fields with real data, response under 500ms with test data.
```

---

## PHASE 6 — AI Security Assistant

```
Read CLAUDE.md and PHASES.md. Phases 1-5 complete. Build Phase 6 — AI Security Assistant.

Reference files:
- docs/15_AI_PROMPTS.md — exact system prompt for the assistant
- docs/05_API_REFERENCE.md — /api/chat endpoints
- docs/01_PLATFORM_OVERVIEW.md — F08 feature spec

Build:
1. server/models/ChatMessage.js — fields: userId (index), scanId (optional ref Scan), role (user|assistant), content (max 10000), tokenUsage ({inputTokens, outputTokens}), tier. Indexes: {userId, createdAt:-1}, {userId, createdAt:1}.

2. server/services/ai/promptBuilder.js
   Export buildAssistantSystemPrompt(user, scanContext):
   - Base system prompt: "You are a cybersecurity assistant helping users understand and fix security issues on their websites. You are NOT a certified penetration tester. All findings come from automated tools and may include false positives. Always label your guidance as 'AI-Assisted Guidance'. Be clear, practical, and specific. When giving code examples, ask about the tech stack first or provide the most common implementation."
   - If scanContext provided: include top 15 findings summary (title, severity, OWASP category, recommendation)
   - Include OWASP Top 10 2021 definitions
   - Include the website URL for context

3. server/services/ai/assistant.js
   Export sendMessage(userId, content, options = { scanId, history, tier }):
   - If scanId provided: fetch scan + top 15 vulnerabilities for context
   - Build system prompt with buildAssistantSystemPrompt
   - Fetch last 10 ChatMessages for this user as conversation history
   - Call Anthropic Claude API (claude-sonnet-4-6) with prompt caching on system prompt:
     system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
   - Return { content, inputTokens, outputTokens }

4. server/controllers/chatController.js:
   - sendMessage: 
     Check daily limit: count ChatMessages by this userId today where role='user'. Compare to FREE_AI_MESSAGES_PER_DAY (free) or PREMIUM_AI_MESSAGES_PER_DAY (premium). Throw 429 if over limit.
     Validate: content max 2000 chars.
     Call assistant.sendMessage().
     Save both user message and assistant message to ChatMessage collection.
     Return assistant message with note: all responses include { aiAssisted: true } flag.
   - getHistory: last 30 messages for userId, sorted oldest first
   - clearHistory: delete all ChatMessages for userId

5. server/routes/chatRouter.js — all routes under protect middleware
6. In server/app.js: mount at /api/chat

Done when:
POST /api/chat/message with { content: "What is XSS?" } returns AI response
POST /api/chat/message with { content, scanId } returns AI response with scan context
21st message today for free user returns 429
```

---

## PHASE 7 — AI Roadmap Generator

```
Read CLAUDE.md and PHASES.md. Phases 1-6 complete. Build Phase 7 — AI Roadmap Generator.

Reference: docs/15_AI_PROMPTS.md — roadmap generation prompt section

Build:
1. server/models/Roadmap.js — fields: userId, scanId (unique), websiteId, summary, estimatedStartScore, estimatedEndScore, steps ([{week, title, why, how, estimatedScoreGain, isDone, completedAt, severity}]), status (generating|completed|failed), error, generatedAt, tokenUsage. Index: {scanId} unique, {userId, createdAt:-1}.

2. server/services/ai/roadmapGenerator.js
   Export generateRoadmap(scan, vulnerabilities):
   - Build prompt from docs/15_AI_PROMPTS.md roadmap section
   - Include: scan score, grade, top findings grouped by severity
   - Instruct Claude to return ONLY valid JSON (no markdown, no preamble):
     { summary, estimatedStartScore, estimatedEndScore, steps: [{ week, title, why, how, estimatedScoreGain, severity }] }
   - Call Claude API with claude-sonnet-4-6, max_tokens: 2000
   - Parse response: strip any ```json fences before JSON.parse()
   - Return parsed roadmap data + tokenUsage

3. server/controllers/roadmapController.js:
   - generateRoadmap: 
     Ownership check on scan.
     Check if roadmap already exists for this scanId (return existing if status=completed).
     Create Roadmap document with status='generating'.
     Fetch scan + all vulnerabilities for that scan.
     Call generateRoadmap service.
     Update Roadmap with steps + status='completed'.
     Return roadmap.
   - getRoadmap: ownership check via scanId → find scan → find roadmap by scanId
   - updateStep: find roadmap (ownership check via userId), find step by _id in steps array, toggle isDone + completedAt

4. server/routes/roadmapRouter.js — all under protect
5. In server/app.js: mount at /api/roadmaps

Done when:
POST /api/roadmaps/:scanId generates a roadmap with week-by-week steps in JSON format
PATCH /api/roadmaps/:roadmapId/steps/:stepId toggles isDone
```

---

## PHASE 8 — PDF Report Generation

```
Read CLAUDE.md and PHASES.md. Phases 1-7 complete. Build Phase 8 — PDF Report Generation.

Reference: docs/03_ARCHITECTURE.md — PDF Generation Flow section

Build:
1. server/models/Report.js — fields: userId, scanId, websiteId, status (generating|completed|failed), error, cloudinaryUrl, cloudinaryPublicId, fileSizeBytes, generatedAt, tokenUsage. Index: {scanId}, {userId, createdAt:-1}.

2. server/services/pdf/reportTemplate.js
   Export buildReportHtml(reportData):
   - reportData: { website, scan, vulnerabilities, roadmap, executiveSummary, generatedAt }
   - Returns full HTML string with inline CSS only (no external stylesheets — Puppeteer can't load them)
   - Sections: cover page (logo, website, date, score, grade), executive summary, score breakdown, vulnerability table (severity, title, OWASP, status), detailed findings for Critical/High (one section each), OWASP category breakdown, AI recommendations summary, remediation checklist
   - Style: professional, clean. Use inline styles. Color-code severity: critical=red, high=orange, medium=yellow, low=blue, info=gray.

3. server/services/ai/executiveSummaryGenerator.js
   Export generateExecutiveSummary(scan, vulnerabilities):
   - Prompt: "Write a 150-200 word plain English executive summary of this security scan for a non-technical audience. Mention the score, the most critical findings, and the overall risk level. Do not use jargon. Do not make guarantees. Label it AI-Assisted."
   - Call Claude API, return text string

4. server/services/pdf/reportGenerator.js
   Export generatePDF(reportData):
   - Import puppeteer
   - Launch browser: puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined })
   - Set content: page.setContent(buildReportHtml(reportData), { waitUntil: 'networkidle0' })
   - Print to PDF: page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } })
   - Always close browser in finally block
   - Return PDF buffer

5. server/services/pdf/cloudinaryUploader.js
   Export uploadPDF(buffer, scanId):
   - Upload buffer to Cloudinary using upload_stream
   - Folder: 'reports/', public_id: report-{scanId}
   - resource_type: 'raw'
   - Returns { url, publicId, bytes }

6. server/services/queue/reportQueue.js — BullMQ Queue for report jobs
7. server/services/queue/reportWorker.js — processor:
   - Fetch scan + website + all vulnerabilities + roadmap (if exists) for the scan
   - Generate executive summary (Claude API)
   - Build report HTML
   - Generate PDF buffer
   - Upload to Cloudinary
   - Update Report: status=completed, cloudinaryUrl, fileSizeBytes, generatedAt
   - Emit report:complete event via POST /internal/emit

8. server/controllers/reportController.js:
   - generateReport: ownership check on scan. Check free tier limit (1 report per scan). Check if report already exists + completed → return existing. Create Report (status:generating). Enqueue report job. Return { reportId, status: "generating" }.
   - getReport: ownership check via userId
   - listReports: paginated list for userId

9. server/routes/reportRouter.js
10. Update server/workers/index.js: import + start reportWorker
11. In server/app.js: mount at /api/reports

Done when:
POST /api/reports/:scanId generates PDF, uploads to Cloudinary, Socket.io emits report:complete with downloadUrl
```

---

## PHASE 9 — Deep Scanner

```
Read CLAUDE.md and PHASES.md. Phases 1-4 complete (Phase 9 only needs Phase 4). Build Phase 9 — Deep Scanner.

Reference: docs/06_SCANNER_INTEGRATION.md — ZAP, Nuclei, testssl.sh sections carefully

CRITICAL SECURITY RULES FOR THIS PHASE:
- ALL scanner subprocesses MUST use execFile(binaryPath, [argsArray]) — NEVER exec('cmd ' + url)
- ZAP must be called via its REST API (http://localhost:8090) — not subprocess
- Always validate targetUrl before passing to any tool
- Deep scan gate: website.verified===true AND req.tier==='premium' — check BOTH in controller

Build:
1. server/services/scanner/tools/zapRunner.js
   - ZAP must already be running as Docker container (docker-compose.dev.yml)
   - Spider: GET {ZAP_API_URL}/JSON/spider/action/scan/?url={targetUrl}&apikey={ZAP_API_KEY}
   - Poll spider until complete: GET {ZAP_API_URL}/JSON/spider/view/status/
   - Active scan: GET {ZAP_API_URL}/JSON/ascan/action/scan/?url={targetUrl}&apikey={ZAP_API_KEY}
   - Poll active scan until complete (check /JSON/ascan/view/status/)
   - Get alerts: GET {ZAP_API_URL}/JSON/core/view/alerts/?baseurl={targetUrl}&apikey={ZAP_API_KEY}
   - Timeout: 5 minutes total for ZAP
   - Return { alerts: [], _durationMs }

2. server/services/scanner/tools/nucleiRunner.js
   - Use execFile(process.env.NUCLEI_BINARY_PATH, ['-u', targetUrl, '-json', '-no-interactsh', '-t', 'http/exposures/', '-t', 'http/misconfiguration/', '-silent'], { timeout: 120000 })
   - Parse stdout line by line (JSONL format — one JSON object per line)
   - Return array of parsed results + _durationMs

3. server/services/scanner/tools/testsslRunner.js
   - Use execFile(process.env.TESTSSL_PATH, ['--jsonfile', '/dev/stdout', '--quiet', '--color', '0', targetUrl], { timeout: 180000 })
   - Parse stdout as JSON array
   - Return parsed results + _durationMs

4. Extend server/services/scanner/normalizer.js:
   - Add normalizeZAP(zapAlerts, targetUrl) — map ZAP riskcode to severity (0=info,1=low,2=medium,3=high), map CWE IDs to OWASP categories, toolFindingId = "zap-{pluginid}-{hash of url}"
   - Add normalizeNuclei(nucleiResults, targetUrl) — map Nuclei severity, category from tags, owaspCategory: A06 for CVE findings, toolFindingId = "nuclei-{template-id}-{hash}"
   - Add normalizeTestssl(testsslData, targetUrl) — map severity (CRITICAL→critical, HIGH→high, etc.), skip OK results, toolFindingId = "testssl-{id}"

5. Extend server/services/queue/scanWorker.js:
   - After SSLyze block, add: if (type === 'deep') { run ZAP, Nuclei, testssl — each in try/catch, non-fatal }
   - Import and call normalizeZAP, normalizeNuclei, normalizeTestssl
   - Push all deep findings into allFindings array

6. Verify in server/controllers/scanController.js createScan:
   - If type === 'deep': check website.verified === true → throw 403 DOMAIN_NOT_VERIFIED if not
   - If type === 'deep': check req.tier === 'premium' → throw 403 PLAN_LIMIT_REACHED if not

7. Add ZAP to docker/docker-compose.dev.yml:
   zap:
     image: ghcr.io/zaproxy/zaproxy:stable
     container_name: sap-zap
     ports: ["8090:8080"]
     command: zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
     restart: unless-stopped

8. Create docker/zap/zap-baseline.yaml — ZAP Automation Framework config for baseline passive scan

Done when:
Premium user with verified domain triggers deep scan → ZAP + Nuclei + testssl findings appear in vulnerability list alongside baseline findings
Free user or unverified domain → 403 error
```

---

## PHASE 10 — Stripe Billing

```
Read CLAUDE.md and PHASES.md. Phase 2 is complete (billing only needs auth). Build Phase 10 — Stripe Billing.

Reference: docs/16_DATA_FLOWS.md — Stripe Subscription Flow section (read the full flow)

CRITICAL: The Stripe webhook route MUST use express.raw() body parser, NOT express.json().
It MUST be mounted in app.js BEFORE express.json() middleware.

Build:
1. server/services/billing/stripeService.js
   - createCustomer(userId, email, name): stripe.customers.create({email, name, metadata:{userId}})
   - createCheckoutSession(stripeCustomerId): stripe.checkout.sessions.create with mode:'subscription', line_items with STRIPE_PREMIUM_PRICE_ID, success_url and cancel_url from CLIENT_URL
   - createPortalSession(stripeCustomerId): stripe.billingPortal.sessions.create
   - getSubscription(stripeSubscriptionId): stripe.subscriptions.retrieve

2. server/controllers/billingController.js:
   - createCheckout: if no stripeCustomerId → createCustomer → save to user → createCheckoutSession → return { checkoutUrl }
   - createPortal: get user.subscription.stripeCustomerId → createPortalSession → return { portalUrl }
   - getSubscription: return user.subscription fields (plan, status, trialEnd, currentPeriodEnd) — never return stripe IDs

3. server/routes/billingRouter.js — all under protect

4. server/routes/webhookRouter.js:
   - POST / with express.raw({ type: 'application/json' }) as local middleware
   - stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)
   - If signature fails → return 400
   - Handle these events:
     customer.subscription.created → find user by stripeCustomerId, update subscription: { stripeSubscriptionId, status, plan:'premium', currentPeriodEnd }
     customer.subscription.updated → same user lookup, update status and currentPeriodEnd
     customer.subscription.deleted → update status:'canceled', plan:'free'
     invoice.payment_failed → update status:'past_due'
   - Always return 200 { received: true } even for unhandled event types (Stripe requires 200)

5. In server/app.js:
   - Mount /webhooks/stripe using webhookRouter BEFORE express.json() middleware (this is critical — order matters)
   - Mount /api/billing using billingRouter (after express.json())

Done when:
POST /api/billing/create-checkout → returns Stripe checkout URL
Stripe CLI test: stripe listen --forward-to localhost:5000/webhooks/stripe
stripe trigger customer.subscription.created → user.subscription.status becomes 'active'
Free tier limits still enforced after billing is wired up
```

---

## PHASE 11 — Security Hardening

```
Read CLAUDE.md and PHASES.md. All previous phases complete. This is the final hardening pass.

Perform a complete security and quality audit of the entire server/ codebase.

SECURITY AUDIT — check every route file and controller:
1. Does every protected endpoint have authenticateToken + checkSubscription (protect middleware)?
2. Does every controller that accesses a resource have an ownership check (findOne with userId)?
3. Does every request body have Zod validation?
4. Does every endpoint have rate limiting?
5. Does any endpoint return sensitive fields: password, tokens, stripeCustomerId, stripeSubscriptionId?
6. Is the refresh token cookie set with: httpOnly:true, secure:NODE_ENV=production, sameSite:'strict', path:'/api/auth/refresh'?
7. Is CORS set to exact CLIENT_URL, not wildcard?
8. Does helmet config in app.js match exactly what docs/09_SECURITY_RULES.md specifies?
9. Are all MongoDB indexes defined in model files actually created? List any missing ones.
10. Do any scan runner tools use exec() with string interpolation instead of execFile() with array args?

Fix every issue found above.

PERFORMANCE:
- Set BullMQ scanWorker concurrency to 2 if not already
- Ensure Promise.all is used in dashboardController for parallel queries
- Verify no N+1 queries (populate only what frontend needs)

TESTING — create these test files:
- server/__tests__/scoreEngine.test.js: test all edge cases: empty findings=100, one critical=80, floor at 0, mixed severities
- server/__tests__/auth.test.js: test ownership check — user A cannot access user B's website (expects 404)
- server/__tests__/rateLimiter.test.js: test free tier scan limit enforcement

DOCUMENTATION — create:
- README.md in project root with: what it is, prerequisites, setup steps, how to run (API + worker + Docker), env vars reference, how to run tests, deployment overview

After all fixes, list every change made and explain why each one was needed.
```

---

---

# Debugging Prompts (Use These When Something Breaks)

---

## When You Get an Error

```
I'm getting this error:
[PASTE EXACT ERROR MESSAGE AND STACK TRACE]

In this file: [PASTE FILE PATH]
On this route: [e.g. POST /api/scans]

Here is the relevant code:
[PASTE THE SPECIFIC FUNCTION OR FILE]

What I already tried:
[DESCRIBE WHAT YOU TRIED]

Check CLAUDE.md for the correct patterns. Identify the root cause and fix it.
```

---

## When a Scanner Tool Fails

```
The [observatory|sslyze|zap|nuclei|testssl] scanner is failing.

Error: [PASTE ERROR]

Current runner code is in server/services/scanner/tools/[toolName]Runner.js.
Check docs/06_SCANNER_INTEGRATION.md for the correct integration approach for this tool.

Diagnose and fix. If the tool isn't installed, tell me exactly what to install and how.
```

---

## When Socket.io Events Aren't Reaching the Frontend

```
Socket.io events are not reaching the frontend. The scan completes in the worker but no event arrives.

Worker emits via POST /internal/emit.
Internal route is at server/routes/internalRouter.js.
Socket setup is at server/config/socket.js.

Check:
1. Is the /internal/emit route mounted correctly in app.js?
2. Is the INTERNAL_API_KEY matching between worker and API server?
3. Is the user joined to the correct room "user:{userId}"?
4. Is the event name matching between emit and listener?

Diagnose and fix each layer.
```

---

## When AI Responses Are Empty or Erroring

```
The Claude API is returning an error or empty response.

Error: [PASTE ERROR]
Code: [PASTE THE assistant.js call]

Check:
1. Is the ANTHROPIC_API_KEY valid (starts with sk-ant-)?
2. Is the model name correct: claude-sonnet-4-6?
3. Is the prompt caching set up correctly (system as array, not string)?
4. Is the message history in the correct format?

Fix the API call in server/services/ai/assistant.js.
```

---

## When Stripe Webhooks Fail

```
Stripe webhooks are returning 400 or the subscription status isn't updating.

Webhook error: [PASTE ERROR from Stripe dashboard or CLI]
Webhook handler: server/routes/webhookRouter.js

Check:
1. Is the webhook route mounted BEFORE express.json() in app.js?
2. Is express.raw({ type: 'application/json' }) applied to this route only?
3. Is STRIPE_WEBHOOK_SECRET the correct signing secret (from Stripe CLI or dashboard)?
4. Is the event type being handled correctly?

Fix and test with: stripe trigger customer.subscription.created
```

---

# Quick Reference Prompts

---

## Add a New API Endpoint

```
Add a new endpoint: [HTTP METHOD] /api/[path]

Spec: [describe what it does]
Authentication: [required/not required]
Tier check: [free/premium/both]
Rate limit: [yes/no, which limiter]

Follow the controller pattern in docs/10_COMMON_PATTERNS.md exactly:
- Zod validation schema in server/schemas/
- Controller in server/controllers/
- Route in server/routes/
- Ownership check using findOne({ _id, userId: req.user._id })
- Wire into app.js
```

---

## Add a New Mongoose Model

```
Create a new Mongoose model for [collection name].

Fields needed: [list fields]
Reference: docs/04_DATABASE_SCHEMA.md section [section name]

Follow the model pattern in docs/10_COMMON_PATTERNS.md:
- Use timestamps: true
- toJSON transform removes __v
- Define indexes as compound index() calls (not field-level)
- Use select:false on any sensitive fields
```

---

## Code Review

```
Review this code for security and quality issues.

File: [PASTE FILE PATH]
Code:
[PASTE CODE]

Check against:
1. docs/09_SECURITY_RULES.md — any security violations?
2. docs/10_COMMON_PATTERNS.md — does it follow the standard patterns?
3. CLAUDE.md non-negotiable rules — any violations?
4. Missing error handling, missing ownership checks, missing Zod validation?

List every issue found and provide the corrected version.
```
