# Data Flow Reference — Every Feature End to End

This file traces the exact data path for every major user action.
Use this when debugging "where did the data go?" or "what touches what?"

---

## 1. User Registration Flow

```
User fills register form
    │
    ▼
Frontend validates with Zod
(name: string, email: valid email, password: min 8 chars)
    │
    ▼
POST /api/auth/register
{ name, email, password }
    │
    ▼
Auth rate limiter (5 req/15min per IP)
    │
    ▼
AuthController.register()
    ├── Zod validate body
    ├── Check email not already taken → if taken: 409
    ├── bcrypt.hash(password, 12) → hashedPassword
    ├── Generate emailVerificationToken (JWT, 24h, signed with JWT_EMAIL_SECRET)
    ├── User.create({
    │     name, email, password: hashedPassword,
    │     emailVerified: false,
    │     emailVerificationToken,
    │     subscription: { status: 'trialing', trialEnd: now + 14 days }
    │   })
    ├── stripe.customers.create({ email, name }) → stripeCustomerId
    │   (async — don't await, don't block response)
    ├── emailService.sendVerificationEmail(email, token)
    └── Response: 201 { message: "Check your email to verify your account" }
    │
    ▼
User receives email with link:
https://yourdomain.com/verify-email?token=<jwt>
    │
    ▼
GET /api/auth/verify-email?token=<jwt>
    ├── Verify JWT signature with JWT_EMAIL_SECRET
    ├── Check token not expired
    ├── Find user by emailVerificationToken
    ├── User.update({ emailVerified: true, emailVerificationToken: null })
    └── Response: 200 → Frontend redirects to /login with "Email verified!" toast
```

---

## 2. Login and Token Flow

```
POST /api/auth/login { email, password }
    │
    ▼
AuthController.login()
    ├── Zod validate
    ├── User.findOne({ email })
    ├── if (!user || !user.emailVerified) → 401 "Invalid credentials"
    │   (same error for both — don't reveal which)
    ├── bcrypt.compare(password, user.password)
    ├── if (!match) → 401 "Invalid credentials"
    ├── Generate accessToken:
    │   jwt.sign({ userId: user._id, email }, JWT_ACCESS_SECRET, { expiresIn: '15m' })
    ├── Generate refreshToken:
    │   jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
    ├── Set httpOnly cookie: refreshToken (Secure, SameSite=Strict)
    ├── User.update({ lastLoginAt: now })
    └── Response: 200 {
          accessToken,
          user: { _id, name, email, avatar, subscription, emailVerified }
        }
    │
    ▼
Frontend (Axios interceptor)
    ├── Store accessToken in Zustand (memory only — never localStorage)
    ├── All subsequent requests: Authorization: Bearer <accessToken>
    │
    ▼
When accessToken expires (401 response on any request):
    │
    ▼
Axios interceptor catches 401
    ├── POST /api/auth/refresh (sends httpOnly cookie automatically)
    ├── Server verifies refreshToken cookie
    ├── Issues new accessToken
    ├── Original failed request retried with new token
    └── User never sees the 401 — it's transparent
```

---

## 3. Add Website Flow

```
User submits AddWebsiteModal form
{ url: "https://example.com", nickname: "My Site" }
    │
    ▼
POST /api/websites
    │
    ▼
authenticateToken middleware
    ├── Extract Bearer token from Authorization header
    ├── jwt.verify(token, JWT_ACCESS_SECRET)
    ├── User.findById(decoded.userId).select('-password')
    └── req.user = user
    │
    ▼
checkSubscription middleware
    ├── Check user.subscription.status
    ├── Check user.subscription.trialEnd
    └── req.tier = 'free' or 'premium'
    │
    ▼
WebsiteController.create()
    ├── Zod validate { url, nickname }
    ├── Parse URL → extract domain (new URL(url).hostname)
    ├── Normalize URL (strip path, port, trailing slash)
    ├── Check no duplicate: Website.findOne({ userId, domain, isDeleted: false })
    ├── Count existing: Website.countDocuments({ userId, isDeleted: false })
    ├── if (count >= 3 && req.tier === 'free') → 403 PLAN_LIMIT_REACHED
    ├── Generate verificationToken: "sav-verify-" + uuidv4()
    ├── Website.create({
    │     userId: req.user._id,
    │     url, domain, nickname,
    │     verified: false,
    │     verificationToken
    │   })
    └── Response: 201 {
          website: { ...websiteData },
          verificationInstructions: {
            dns: {
              name: `_security-audit-verify.${domain}`,
              value: verificationToken,
              ttl: 300
            },
            meta: {
              tag: `<meta name="security-audit-verify" content="${verificationToken}">`
            }
          }
        }
    │
    ▼
Frontend
    ├── QueryClient.invalidateQueries(['websites'])
    ├── Show VerifyDomainPage with instructions
    └── Website card appears with "Unverified" badge
```

---

## 4. Domain Verification Flow

```
User clicks "Check Verification" on VerifyDomainPage
{ method: 'dns' OR 'meta' }
    │
    ▼
POST /api/websites/:id/verify
    │
    ▼
WebsiteController.verify()
    ├── Fetch website (ownership check: { _id, userId: req.user._id })
    ├── if (!website) → 404
    │
    ├── [DNS method]
    │   ├── dns.promises.resolveTxt(`_security-audit-verify.${website.domain}`)
    │   ├── Flatten results: records.flat()
    │   ├── Check if any record === website.verificationToken
    │   └── if found → verified = true
    │
    ├── [Meta method]
    │   ├── fetch(`https://${website.domain}`, { timeout: 10000 })
    │   ├── Parse HTML with cheerio
    │   ├── $('meta[name="security-audit-verify"]').attr('content')
    │   └── Check if content === website.verificationToken
    │
    ├── if (verified):
    │   ├── Website.update({ verified: true, verifiedAt: now, verificationMethod: method })
    │   └── Response: 200 { verified: true }
    └── if (!verified):
        └── Response: 200 { verified: false, message: "Token not found. Check your DNS/HTML and try again." }
    │
    ▼
Frontend
    ├── Show success animation
    ├── Invalidate website query
    └── "Deep Scan" button now enabled (if premium)
```

---

## 5. Baseline Scan — Complete Data Flow

```
User clicks "Scan Now"
    │
    ▼
POST /api/scans { websiteId, type: 'baseline' }
    │
    ▼
ScanController.create()
    ├── Fetch website (ownership check)
    ├── Check scan rate limit:
    │   ScanRateLimit.findOne({ userId, websiteId, date: today })
    │   if count >= 3 && free tier → 429
    ├── Create scan document:
    │   Scan.create({ websiteId, userId, url, type: 'baseline', status: 'queued' })
    ├── Increment rate limit counter
    ├── scanQueue.add('run-scan', { scanId, websiteId, userId, url, type })
    └── Response: 202 { scanId, status: 'queued', position: await scanQueue.count() }
    │
    ▼
Frontend receives response
    ├── Store scanId in state
    ├── Open ScanProgressModal
    └── socket.on(`scan:progress:${scanId}`, updateProgress)
    │
    ▼
BullMQ Worker picks up job
    │
    ▼
scanWorker.js processes job
    │
    ├── Scan.update({ status: 'running', startedAt: now })
    ├── emitProgress(userId, scanId, 'starting', 0)
    │
    ├── ── OBSERVATORY ──────────────────────────────────────────
    ├── observatoryRunner.runObservatory(url)
    │   ├── import { scan } from 'mdn-http-observatory'
    │   ├── scan(domain, { rescanIfStale: true })
    │   └── Returns: { grade, score, tests: { ... } }
    ├── emitProgress(userId, scanId, 'headers', 30)
    │
    ├── ── SSLYZE ───────────────────────────────────────────────
    ├── sslyzeRunner.runSSLyze(url)
    │   ├── execFile('python3', ['-m', 'sslyze', '--json_out=-', hostname])
    │   ├── Parse stdout JSON
    │   └── Returns: { server_scan_results: [...] }
    ├── emitProgress(userId, scanId, 'ssl', 60)
    │
    ├── ── NORMALIZE ────────────────────────────────────────────
    ├── normalizer.normalizeResults({ observatoryResult, sslyzeResult })
    │   ├── normalizeObservatory(observatoryResult)
    │   │   ├── Iterate over tests
    │   │   ├── For each failing test → create finding object
    │   │   └── Map to unified schema (title, severity, owaspCategory, etc.)
    │   ├── normalizeSSLyze(sslyzeResult)
    │   │   ├── Check SSL 2.0/3.0/TLS 1.0/1.1 → if accepted: finding
    │   │   ├── Check certificate expiry
    │   │   └── Map to unified schema
    │   └── Returns: [{ title, severity, category, owaspCategory, ... }, ...]
    │
    ├── ── SCORE ────────────────────────────────────────────────
    ├── scoreEngine.calculateScore(findings)
    │   ├── Start at 100
    │   ├── Subtract per severity (critical -20, high -10, medium -5, low -2)
    │   ├── Floor at 0
    │   └── Returns: { score, grade, riskLevel }
    │
    ├── ── SAVE VULNERABILITIES ─────────────────────────────────
    ├── For each finding:
    │   ├── Check existing: Vulnerability.findOne({ websiteId, toolFindingId })
    │   ├── if exists AND status in ['open','assigned','in_progress']:
    │   │   └── Vulnerability.update({ lastSeenAt: now, lastCheckedScanId: scanId })
    │   ├── if exists AND status === 'fixed':
    │   │   └── Vulnerability.update({ status: 'open', lastSeenAt: now }) // regression!
    │   └── if not exists:
    │       └── Vulnerability.create({ ...finding, scanId, websiteId, userId, firstSeenAt: now })
    │
    ├── ── AUTO-VERIFY FIXED VULNS ──────────────────────────────
    ├── Find vulns with status 'fixed' and lastCheckedScanId !== this scanId
    │   → These were 'fixed' but not seen in this scan → mark as 'verified'
    │   Vulnerability.updateMany({ websiteId, status: 'fixed', lastCheckedScanId: { $ne: scanId } },
    │                             { status: 'verified', resolvedAt: now })
    │
    ├── ── UPDATE SCAN DOCUMENT ────────────────────────────────
    ├── Calculate findingCounts from findings array
    ├── Calculate owaspDistribution from findings array
    ├── Scan.update({
    │     status: 'complete', score, grade, riskLevel,
    │     findingCounts, owaspDistribution,
    │     rawResults: { observatory: ..., sslyze: ... },
    │     completedAt: now,
    │     durationMs: now - startedAt
    │   })
    │
    ├── ── UPDATE WEBSITE ───────────────────────────────────────
    ├── Website.update({ latestScore: score, latestGrade: grade, latestScanId: scanId, lastScannedAt: now })
    │
    └── ── EMIT COMPLETE ────────────────────────────────────────
        POST /internal/emit { room: `user:${userId}`, event: 'scan:complete', data: { scanId, score, grade, findingCounts } }
        │
        ▼
        API Server emits socket event → Client
        │
        ▼
        Frontend: close progress modal → navigate to /scans/:scanId
```

---

## 6. AI Chat Message Flow

```
User types message and clicks Send
    │
    ▼
POST /api/chat/message
{ message, sessionId, attachedScanId? }
    │
    ▼
ChatController.sendMessage()
    ├── Auth check
    ├── Check AI message rate limit:
    │   ├── If user.aiMessagesResetAt < today: reset counter to 0
    │   ├── Limit: 20 (free) or 200 (premium)
    │   └── if count >= limit → 429 with upgrade prompt
    ├── Fetch chat history:
    │   ChatMessage.find({ userId, sessionId }).sort({ createdAt: 1 }).limit(10)
    ├── If attachedScanId:
    │   ├── Scan.findOne({ _id: attachedScanId, userId })
    │   └── Vulnerability.find({ scanId: attachedScanId }).limit(15)
    ├── Build system prompt:
    │   assistantService.buildAssistantSystemPrompt(scanContext, userWebsites)
    ├── Build messages array:
    │   [...chatHistory.map(m => ({ role: m.role, content: m.content })),
    │    { role: 'user', content: message }]
    ├── Call Anthropic API:
    │   anthropic.messages.create({ model, max_tokens: 1024, system, messages })
    ├── Save user message: ChatMessage.create({ userId, sessionId, role: 'user', content: message })
    ├── Save assistant message: ChatMessage.create({ userId, sessionId, role: 'assistant', content: reply, inputTokens, outputTokens })
    ├── Increment: User.update({ $inc: { aiMessagesUsedToday: 1 } })
    └── Response: 200 { reply, sessionId, usage: { inputTokens, outputTokens } }
    │
    ▼
Frontend
    ├── Append user message to chat (optimistic)
    ├── Show typing indicator
    ├── On response: replace typing indicator with AI message
    ├── Render markdown in AI response (react-markdown)
    └── Update usage counter
```

---

## 7. Roadmap Generation Flow

```
User clicks "Generate My Security Roadmap" on ScanResultsPage
    │
    ▼
POST /api/roadmaps { scanId }
    │
    ▼
RoadmapController.generate()
    ├── Auth check (ownership: scan.userId === req.user._id)
    ├── Check existing: Roadmap.findOne({ scanId })
    │   └── if exists → return existing (don't regenerate)
    ├── Fetch scan: Scan.findById(scanId) (need score, findings counts)
    ├── Fetch vulnerabilities: Vulnerability.find({ scanId, status: { $nin: ['false_positive','closed'] } })
    ├── Call roadmapGenerator.generateRoadmap(scan, vulnerabilities):
    │   ├── Build system prompt (from 15_AI_PROMPTS.md)
    │   ├── Build user prompt with all open findings
    │   ├── anthropic.messages.create({ max_tokens: 2048, ... })
    │   ├── Parse JSON response (with safety cleaning)
    │   └── Validate structure
    ├── Map linkedFindingTitles → actual vulnerability _ids
    │   (Vulnerability.find({ title: { $in: linkedTitles }, websiteId }))
    ├── Roadmap.create({
    │     scanId, userId, websiteId,
    │     currentScore: scan.score,
    │     projectedScore: parsedRoadmap.projectedScore,
    │     weeks: parsedRoadmap.weeks (with linkedVulnIds populated)
    │   })
    ├── Scan.update({ roadmapId: roadmap._id })
    └── Response: 200 { roadmap }
    │
    ▼
Frontend
    ├── Navigate to /roadmap/:scanId
    └── Render week accordion with tasks
```

---

## 8. PDF Report Generation Flow

```
User clicks "Generate PDF Report" on ScanResultsPage
    │
    ▼
POST /api/reports { scanId }
    │
    ▼
ReportController.generate()
    ├── Auth check
    ├── Check existing: Report.findOne({ scanId, status: 'ready' })
    │   └── if exists → return { status: 'ready', downloadUrl }
    ├── Check free tier limit (1 PDF per scan — enforced by Report.findOne({ scanId }))
    ├── Report.create({ scanId, userId, websiteId, status: 'generating' })
    ├── Add PDF generation job to queue
    └── Response: 202 { reportId, status: 'generating' }
    │
    ▼
PDF Worker Job
    │
    ├── Fetch all data:
    │   ├── Scan.findById(scanId).populate('websiteId')
    │   ├── Vulnerability.find({ scanId }).sort({ severity: 1 })
    │   └── Roadmap.findOne({ scanId })
    │
    ├── Generate executive summary:
    │   ├── Build prompt (from 15_AI_PROMPTS.md)
    │   ├── anthropic.messages.create({ max_tokens: 512 })
    │   └── executiveSummary = response text
    │
    ├── Render HTML template:
    │   GET http://localhost:5000/internal/report-template/:scanId
    │   (API server serves this internal route with all data embedded)
    │
    ├── Puppeteer PDF generation:
    │   ├── browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    │   ├── page = await browser.newPage()
    │   ├── await page.goto(templateUrl, { waitUntil: 'networkidle0' })
    │   ├── pdfBuffer = await page.pdf({
    │   │     format: 'A4',
    │   │     margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    │   │     printBackground: true
    │   │   })
    │   └── await browser.close()
    │
    ├── Upload to Cloudinary:
    │   ├── cloudinary.uploader.upload_stream({ folder: 'reports', resource_type: 'raw' })
    │   └── Returns: { secure_url, public_id, bytes }
    │
    ├── Report.update({
    │     status: 'ready',
    │     cloudinaryPublicId, cloudinaryUrl,
    │     downloadUrl: cloudinaryUrl,
    │     fileSizeBytes: bytes,
    │     executiveSummary
    │   })
    │
    └── POST /internal/emit { event: 'report:complete', data: { reportId, downloadUrl } }
    │
    ▼
Frontend receives socket event
    ├── Show "Your report is ready!" toast
    └── Download button becomes active
```

---

## 9. Vulnerability Status Change Flow

```
User changes vulnerability status from "Open" to "In Progress"
    │
    ▼
PATCH /api/vulnerabilities/:id
{ status: 'in_progress' }
    │
    ▼
VulnerabilityController.update()
    ├── Auth check
    ├── Fetch vuln: Vulnerability.findOne({ _id, userId: req.user._id })
    ├── Zod validate allowed updates: { status?, priority?, note? }
    ├── Validate status transition:
    │   Allowed transitions:
    │   open → assigned, in_progress, false_positive
    │   assigned → in_progress, open
    │   in_progress → fixed, open
    │   fixed → open (regression — if user marks it back)
    │   false_positive → open (user realizes it's real)
    │   verified → closed
    │   NOTE: 'verified' is set automatically by scanner, not user
    ├── If status === 'fixed': set resolvedAt: now
    ├── If note provided: push to notes array { text, addedBy: req.user._id, addedAt: now }
    ├── Vulnerability.save()
    └── Response: 200 { vulnerability: updated }
    │
    ▼
Frontend
    ├── React Query optimistic update (update cache immediately)
    └── Refresh vulnerability list query
```

---

## 10. Stripe Subscription Flow

```
User clicks "Subscribe Now" on PricingPage
    │
    ▼
POST /api/billing/create-checkout
    │
    ▼
BillingController.createCheckout()
    ├── Auth check
    ├── If !user.subscription.stripeCustomerId:
    │   ├── stripe.customers.create({ email, name })
    │   └── User.update({ 'subscription.stripeCustomerId': customerId })
    ├── stripe.checkout.sessions.create({
    │     customer: stripeCustomerId,
    │     mode: 'subscription',
    │     line_items: [{ price: STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    │     success_url: CLIENT_URL + '/billing?success=true',
    │     cancel_url: CLIENT_URL + '/billing?canceled=true',
    │   })
    └── Response: 200 { checkoutUrl: session.url }
    │
    ▼
Frontend redirects to Stripe hosted checkout page
    │
    ▼
User completes payment on Stripe
    │
    ▼
Stripe sends webhook: customer.subscription.created
    │
    ▼
POST /webhooks/stripe (raw body)
    ├── stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    ├── Handle 'customer.subscription.created':
    │   ├── Find user by stripeCustomerId
    │   └── User.update({
    │         'subscription.stripeSubscriptionId': subscription.id,
    │         'subscription.status': 'active',
    │         'subscription.plan': 'premium',
    │         'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
    │       })
    └── Response: 200 { received: true }
    │
    ▼
User returns to /billing?success=true
    ├── React Query refetches /api/auth/me
    ├── User object now shows subscription.status: 'active'
    └── All premium features unlocked immediately
```

---

## 11. Real-Time Socket Connection Flow

```
Frontend app mounts (after successful login)
    │
    ▼
useSocket hook initializes
    ├── const socket = io(VITE_SOCKET_URL, {
    │     auth: { token: accessToken },
    │     transports: ['websocket', 'polling']
    │   })
    │
    ▼
API Server (Socket.io)
    ├── io.use((socket, next) => {
    │     const token = socket.handshake.auth.token;
    │     jwt.verify(token, JWT_ACCESS_SECRET) → decoded
    │     socket.userId = decoded.userId;
    │     next();
    │   })
    ├── socket.on('connection', () => {
    │     socket.join(`user:${socket.userId}`) // join user-specific room
    │   })
    │
    ▼
During scan (Worker → API Server → Client):
    │
    ├── Worker: POST /internal/emit
    │   { room: `user:${userId}`, event: 'scan:progress', data: { scanId, stage, progress } }
    │
    ├── API Server receives /internal/emit:
    │   io.to(`user:${userId}`).emit('scan:progress', { scanId, stage, progress })
    │
    └── Client receives:
        socket.on('scan:progress', ({ scanId, stage, progress }) => {
          updateProgressBar(progress);
          updateStageLabel(stage);
        })
```

---

## Data Retention and Cleanup

```
Scan data:
  - Scan documents: kept permanently (soft delete only)
  - rawResults field: consider compressing after 90 days
  - After website deletion: scan data retained 90 days then purged by cron

Vulnerability data:
  - Kept permanently per website
  - After website deletion: retained 90 days

Chat messages:
  - MongoDB TTL index: auto-deleted after 90 days

Rate limit records (ScanRateLimit):
  - MongoDB TTL index: auto-deleted after 2 days

PDF reports (Cloudinary):
  - Stored permanently (Cloudinary free: 25GB)
  - Consider adding download expiry for storage management

Redis data (BullMQ):
  - Completed jobs: removed after count of 100 (configured in queue)
  - Failed jobs: removed after count of 100
  - Rate limit keys: auto-expire per window
```
