# Build Order and Milestones

## Philosophy
Build vertically (one full feature at a time, front-to-back) rather than horizontally (all backend then all frontend). This gives you a working, testable slice of the platform after each milestone.

Always build in this order per feature: Model → Service → Controller → Route → Middleware → Frontend component → Frontend page

---

## Milestone 0 — Project Foundation (Day 1–2)
**Goal:** Both servers running, connected, deployable.

### Backend
- [ ] Initialize Node.js + Express project in `/server`
- [ ] Set up folder structure (see `02_TECH_STACK.md`)
- [ ] Install all dependencies
- [ ] Configure dotenv + validate env vars with Zod on startup
- [ ] Connect to MongoDB (config/db.js)
- [ ] Connect to Redis (config/redis.js)
- [ ] Set up helmet, cors, morgan, express.json()
- [ ] Set up central error handler (middleware/errorHandler.js)
- [ ] Set up AppError class
- [ ] Write health check route: `GET /api/health` → `{ status: "ok", timestamp }`
- [ ] Set up BullMQ scan queue (queue definition only, no worker yet)
- [ ] Set up Winston logger

### Frontend
- [ ] Initialize React + Vite project in `/client`
- [ ] Install all dependencies
- [ ] Configure Tailwind CSS
- [ ] Set up React Router with placeholder pages
- [ ] Set up Axios instance (services/api.js) with base URL and interceptors
- [ ] Set up React Query provider
- [ ] Set up Zustand auth store (stores/authStore.js)
- [ ] Create Layout component (sidebar + header shell)

### Docker
- [ ] Create `docker-compose.yml` with: MongoDB, Redis
- [ ] Verify everything connects

**Done when:** `GET /api/health` returns 200; frontend loads with empty layout.

---

## Milestone 1 — Authentication (Day 3–5)
**Goal:** Full auth flow working end-to-end.

### Depends on: Milestone 0

### Backend
- [ ] User model (models/User.js)
- [ ] Email service (services/email/emailService.js) — Nodemailer + templates
- [ ] AuthController: register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, getMe, updateMe, changePassword
- [ ] Auth routes (routes/auth.js)
- [ ] Auth middleware: `authenticateToken` (verifies JWT, attaches req.user)
- [ ] Rate limiting on auth routes (5 req/15min)
- [ ] Stripe: create customer on register (async, non-blocking)

### Frontend
- [ ] AuthStore (Zustand): user, accessToken, setAuth, clearAuth, refreshToken
- [ ] Axios interceptor: attach token, handle 401 → auto-refresh
- [ ] Pages: Register, Login, VerifyEmail, ForgotPassword, ResetPassword
- [ ] Protected route wrapper component
- [ ] Profile page (view + edit name/avatar)

**Done when:** User can register → verify email → login → see profile → logout → reset password.

---

## Milestone 2 — Website Asset Management (Day 6–8)
**Goal:** Users can add, verify, and manage websites.

### Depends on: Milestone 1

### Backend
- [ ] Website model (models/Website.js)
- [ ] WebsiteController: create, list, get, update, delete, verify
- [ ] Domain verification service:
  - DNS TXT check via `dns.promises.resolveTxt()`
  - HTML meta tag check via HTTP fetch + cheerio parsing
- [ ] Website routes (routes/websites.js)
- [ ] Subscription middleware (middleware/checkSubscription.js) — enforce 3-website limit on free
- [ ] Input sanitization: normalize URL, extract domain

### Frontend
- [ ] WebsitesList page (dashboard main)
- [ ] AddWebsiteModal (form + URL validation)
- [ ] WebsiteCard component (score, grade, last scanned, verify status)
- [ ] DomainVerification page/modal (show both verification methods, "Check" button)
- [ ] DeleteWebsite confirmation modal

**Done when:** User can add a website, see verification instructions, verify domain ownership, and delete websites.

---

## Milestone 3 — Baseline Scanner + Score + Vulnerabilities (Day 9–15)
**Goal:** First working scan end-to-end. This is the most complex milestone.

### Depends on: Milestone 2

### Backend - Queue/Worker
- [ ] BullMQ scan queue (services/queue/scanQueue.js)
- [ ] BullMQ worker (services/queue/scanWorker.js) — runs as separate process
- [ ] Scan model (models/Scan.js)
- [ ] Vulnerability model (models/Vulnerability.js)
- [ ] Observatory runner (tools/observatoryRunner.js)
- [ ] SSLyze runner (tools/sslyzeRunner.js)
- [ ] Normalizer (services/scanner/normalizer.js) — Observatory + SSLyze mappings
- [ ] Score engine (services/scoring/scoreEngine.js)
- [ ] Deduplication logic (check existing vulns before inserting)
- [ ] Vuln auto-verify logic (if previously "fixed" vuln not in new scan → "verified")

### Backend - API
- [ ] ScanController: create, get, getFindings, listForWebsite
- [ ] Scan routes
- [ ] VulnerabilityController: list (with filters), get, update (status/priority/note), stats
- [ ] Vulnerability routes
- [ ] Rate limiting: scan trigger (3/day free)

### Backend - Socket.io
- [ ] Socket.io setup on API server (config/socket.js)
- [ ] Internal emit endpoint: POST /internal/emit
- [ ] Auth middleware for socket connections
- [ ] Worker → emit progress events via internal HTTP call

### Frontend
- [ ] ScanButton component (triggers POST /api/scans, shows queue position)
- [ ] ScanProgressModal (Socket.io events → live progress bar)
- [ ] ScanResultsPage (score, grade, finding summary, OWASP chart)
- [ ] FindingsList component (filterable, sortable list of vulnerabilities)
- [ ] FindingCard component (severity badge, OWASP tag, evidence, recommendation)
- [ ] VulnerabilitiesPage (all vulns across all websites with full filter UI)
- [ ] VulnerabilityDetailModal (full detail + status change + notes)
- [ ] useSocket custom hook
- [ ] Scan history section on website detail page

**Done when:** User can trigger a baseline scan, watch live progress, see score, view findings, change vulnerability status.

---

## Milestone 4 — Dashboard + Analytics (Day 16–18)
**Goal:** Full analytics dashboard with charts.

### Depends on: Milestone 3

### Backend
- [ ] Dashboard API (GET /api/dashboard/summary)
- [ ] Optimize queries (add indexes defined in schema)

### Frontend
- [ ] DashboardPage with all charts:
  - Score trend (line chart, Recharts)
  - Risk distribution (pie chart)
  - OWASP category breakdown (bar chart)
  - Website summary cards
  - Recent scans list
  - Open vulnerabilities count
- [ ] HistoryPage per website (score over time + scan table + compare feature)
- [ ] StatCard component (reusable metric card)

**Done when:** Dashboard shows real data from scans with all charts working.

---

## Milestone 5 — AI Security Assistant (Day 19–22)
**Goal:** Working AI chatbot with scan context.

### Depends on: Milestone 3

### Backend
- [ ] ChatMessage model
- [ ] AI service (services/ai/assistant.js) — Claude API call with system prompt
- [ ] ChatController: sendMessage, getHistory, clearSession
- [ ] Chat routes
- [ ] AI message rate limiting (20/day free, 200/day premium)
- [ ] Daily message count reset logic (cron job or on-request check)

### Frontend
- [ ] ChatPage or ChatSidebar component
- [ ] MessageList component
- [ ] MessageInput component
- [ ] "Attach scan" feature — select a scan to give AI context
- [ ] "AI Guidance" badge on all AI responses
- [ ] Loading skeleton while awaiting AI response
- [ ] Session management (new session button)
- [ ] useChat custom hook

**Done when:** User can ask AI about any vulnerability, get code examples, with scan context attached.

---

## Milestone 6 — AI Roadmap Generator (Day 23–24)
**Goal:** AI generates personalized remediation roadmap from scan.

### Depends on: Milestone 5

### Backend
- [ ] Roadmap model
- [ ] RoadmapGenerator service (services/ai/roadmapGenerator.js)
- [ ] RoadmapController: generate, get, updateTask
- [ ] Roadmap routes

### Frontend
- [ ] RoadmapPage (week-by-week view)
- [ ] RoadmapWeek component (expandable week card)
- [ ] TaskItem component (checkbox + impact badge + score estimate)
- [ ] "Generate Roadmap" button on scan results page
- [ ] Score projection visualization (current → projected score bar)

**Done when:** User can generate a roadmap from any scan and mark tasks complete.

---

## Milestone 7 — PDF Report Generation (Day 25–27)
**Goal:** Professional PDF reports downloadable.

### Depends on: Milestone 6

### Backend
- [ ] Report model
- [ ] PDF report HTML template (views/reportTemplate.html or React-rendered)
- [ ] ReportGenerator service (services/pdf/reportGenerator.js) — Puppeteer
- [ ] Cloudinary upload integration
- [ ] Report BullMQ job (separate queue or same queue with different job type)
- [ ] ReportController: generate, get, getForScan
- [ ] Report routes

### Frontend
- [ ] "Generate Report" button on scan results page
- [ ] Report generation progress (Socket.io)
- [ ] ReportsListPage (user's all reports)
- [ ] Download button → opens Cloudinary URL

**Done when:** User can generate and download a PDF report.

---

## Milestone 8 — Deep Scanner (Day 28–33)
**Goal:** ZAP + Nuclei + testssl.sh working for verified domains.

### Depends on: Milestone 3 (scanner foundation)

### Infrastructure
- [ ] Add ZAP Docker container to docker-compose.yml
- [ ] Install Nuclei binary in worker Docker image
- [ ] Install testssl.sh in worker Docker image or use Docker

### Backend
- [ ] ZAP runner (tools/zapRunner.js)
- [ ] Nuclei runner (tools/nucleiRunner.js)
- [ ] testssl.sh runner (tools/testsslRunner.js)
- [ ] Extend normalizer with ZAP, Nuclei, testssl mappings
- [ ] Extend scanWorker to use deep tools when type === 'deep'
- [ ] Deep scan gating: check verified + premium in scan create controller

### Frontend
- [ ] "Deep Scan" button (only on verified + premium)
- [ ] Deep scan results page (extended findings)
- [ ] Upgrade prompt for free users who try to start deep scan

**Done when:** Premium users with verified domains can run deep scans.

---

## Milestone 9 — Billing + Subscription (Day 34–37)
**Goal:** Stripe subscription fully working.

### Depends on: Milestone 1

### Backend
- [ ] Stripe service (services/stripe.js)
- [ ] BillingController: createCheckout, createPortal, getSubscription
- [ ] Stripe webhook handler (/webhooks/stripe)
- [ ] Enforce all subscription limits in middleware and controllers
- [ ] Test all Stripe webhook events with Stripe CLI

### Frontend
- [ ] PricingPage
- [ ] Upgrade prompt components (reusable, shown when limit hit)
- [ ] BillingPage (current plan, usage, manage subscription button)
- [ ] Trial countdown banner (show days remaining in free trial)

**Done when:** Full payment flow works; free vs premium limits enforced; Stripe webhooks update user subscription status.

---

## Milestone 10 — Polish, Security Hardening, Testing (Day 38–45)
**Goal:** Production-ready.

- [ ] Security audit of the platform itself (run it against itself!)
- [ ] Input validation audit (every endpoint has Zod validation)
- [ ] Rate limiting audit (every endpoint has appropriate limits)
- [ ] Error handling audit (no stack traces leaking)
- [ ] Logging audit (no sensitive data in logs)
- [ ] Add BullMQ Board UI for queue monitoring (dev/admin only)
- [ ] Add loading and error states to all frontend pages
- [ ] Responsive design pass (mobile breakpoints)
- [ ] Empty states for all list pages
- [ ] 404 page
- [ ] Write README with setup instructions
- [ ] Production environment variables check
- [ ] Deployment (Railway / Render / VPS)

---

## Critical Path (What blocks what)

```
M0 (Foundation)
  └── M1 (Auth)
       └── M2 (Websites)
            └── M3 (Baseline Scanner) ← biggest milestone
                 ├── M4 (Dashboard)
                 ├── M5 (AI Assistant)
                 │    └── M6 (Roadmap)
                 │         └── M7 (PDF Reports)
                 └── M8 (Deep Scanner)

M9 (Billing) depends on M1 only — can build in parallel with M4-M8
M10 (Polish) depends on everything
```

## Time Estimate
Total: ~45 working days for a single developer. With Claude Code assistance, expect ~30-35 days for MVP (M0–M9 complete). M10 polish is ongoing.

## What to Skip if Deadline is Tight
In order of least impact on core value:
1. Deep scanner (M8) — platform works great with baseline only
2. PDF reports (M7) — useful but not core
3. Stripe billing (M9) — can use a simple honor system or disable trial expiry during development
