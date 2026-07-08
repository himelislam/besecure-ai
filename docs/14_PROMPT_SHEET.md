# Claude Project Prompt Sheet

This file contains the exact prompts to use when starting each build milestone. 
Copy-paste these into your Claude project conversations for best results.

---

## HOW TO USE THIS FILE

1. Start a **new conversation** in the Claude project for each milestone
2. Copy the exact prompt below for that milestone
3. Claude will consult the reference files and build the correct code
4. After Claude finishes, ask: **"What should I do next?"** — Claude will tell you what to test and what to tackle next

---

## Milestone 0 — Project Foundation

```
Let's start Milestone 0 from the build order. 

Please scaffold the complete Express server with:
- Folder structure from 02_TECH_STACK.md
- package.json with all backend dependencies listed in 02_TECH_STACK.md
- MongoDB connection (config/db.js) using Mongoose
- Redis connection (config/redis.js) using ioredis
- Express app setup with helmet, cors, morgan, express.json()
- AppError class and central error handler from 10_COMMON_PATTERNS.md
- Winston logger setup (never log sensitive fields)
- Environment variable validation with Zod from 08_ENV_AND_SECRETS.md
- Health check route: GET /api/health
- server.js that starts everything

Also scaffold the React + Vite frontend with:
- package.json with all frontend dependencies from 02_TECH_STACK.md
- Tailwind CSS configured
- React Router with placeholder pages for all routes in 11_FRONTEND_UI_GUIDE.md
- Axios instance with interceptors from 10_COMMON_PATTERNS.md
- React Query provider setup
- Zustand auth store from 10_COMMON_PATTERNS.md
- AppLayout shell (sidebar + content area, no real nav links yet)

Finally, create docker-compose.yml that starts MongoDB and Redis locally.

Give me all files with complete code, not placeholders.
```

---

## Milestone 1 — Authentication

```
Build the complete authentication system (Milestone 1 from 07_BUILD_ORDER.md).

Backend — build these in order:
1. User model from 04_DATABASE_SCHEMA.md (full schema, all fields)
2. Email service (services/email/emailService.js) using Nodemailer/Resend — templates for: verification email, password reset email
3. All auth controllers from 05_API_REFERENCE.md: register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, getMe, updateMe, changePassword
4. Auth routes (routes/auth.js)
5. authenticateToken middleware — verifies JWT, attaches req.user
6. checkSubscription middleware — attaches req.tier ('free' or 'premium')
7. Rate limiting on auth routes (5 req/15min) per 09_SECURITY_RULES.md

Apply all security rules from 09_SECURITY_RULES.md:
- bcrypt 12 rounds
- Access token 15min in response body
- Refresh token 7 days in httpOnly Secure SameSite=Strict cookie
- Never return password field
- Same error for wrong credentials and unverified email (don't reveal which)

Frontend — build these:
1. LoginPage with form (React Hook Form + Zod from 10_COMMON_PATTERNS.md)
2. RegisterPage with form
3. VerifyEmailPage (shows "check your email" + handles ?token= query param)
4. ForgotPasswordPage
5. ResetPasswordPage
6. ProtectedRoute component from 10_COMMON_PATTERNS.md
7. Update Axios interceptor for auto-refresh (full implementation from 10_COMMON_PATTERNS.md)
8. Update AuthStore with proper initial state loading (check /api/auth/me on app mount)

Give me all files with complete, production-ready code.
```

---

## Milestone 2 — Website Asset Management

```
Build the website asset management system (Milestone 2 from 07_BUILD_ORDER.md).

Backend:
1. Website model from 04_DATABASE_SCHEMA.md
2. URL normalization utility (strip path, port, trailing slash, ensure https)
3. Domain verification service:
   - DNS TXT check using dns.promises.resolveTxt()
   - HTML meta tag check using node-fetch + cheerio to parse homepage
   - verificationToken format: "sav-verify-" + UUID
4. WebsiteController — all endpoints from 05_API_REFERENCE.md:
   - GET /api/websites (list user's websites)
   - POST /api/websites (create, enforce 3-website limit for free tier using req.tier)
   - GET /api/websites/:id (ownership check)
   - PATCH /api/websites/:id (nickname only)
   - DELETE /api/websites/:id (soft delete)
   - POST /api/websites/:id/verify (check DNS or meta tag)
5. Website routes

Frontend:
1. WebsitesPage from 11_FRONTEND_UI_GUIDE.md
2. AddWebsiteModal (form with URL validation)
3. WebsiteCard component (score, grade, verified badge, actions)
4. VerifyDomainPage — step-by-step wizard showing both DNS and meta tag methods with copy-to-clipboard
5. DeleteWebsite confirmation modal
6. useWebsites and useCreateWebsite hooks from 10_COMMON_PATTERNS.md pattern
7. All loading, error, and empty states

Use all patterns from 10_COMMON_PATTERNS.md. Apply ownership check pattern on every controller.
```

---

## Milestone 3 — Baseline Scanner (Core)

```
Build the baseline scanner system (Milestone 3 from 07_BUILD_ORDER.md). 
This is the most complex milestone — take it step by step.

Step 1 — Models and Queue:
1. Scan model from 04_DATABASE_SCHEMA.md
2. Vulnerability model from 04_DATABASE_SCHEMA.md
3. ScanRateLimit model from 04_DATABASE_SCHEMA.md
4. BullMQ scan queue definition (services/queue/scanQueue.js)

Step 2 — Scanner Tools:
5. Observatory runner (services/scanner/tools/observatoryRunner.js) — uses mdn-http-observatory npm package
6. SSLyze runner (services/scanner/tools/sslyzeRunner.js) — Python subprocess, JSON output
7. Normalizer (services/scanner/normalizer.js) — maps Observatory and SSLyze output to unified finding schema from 06_SCANNER_INTEGRATION.md
8. Score engine (services/scoring/scoreEngine.js) from 06_SCANNER_INTEGRATION.md

Step 3 — Worker:
9. BullMQ worker (services/queue/scanWorker.js) — full implementation from 06_SCANNER_INTEGRATION.md
   - Runs observatory + sslyze
   - Normalizes results
   - Calculates score
   - Saves vulnerabilities with deduplication logic
   - Auto-verifies previously "fixed" vulns not found in new scan
   - Updates scan document
   - Emits progress/complete via internal HTTP to API server

Step 4 — API:
10. ScanController (create scan, get scan, get findings, list for website)
11. VulnerabilityController (list with filters, get, update status/priority/note, stats)
12. Scan routes + Vulnerability routes
13. Socket.io setup on API server
14. Internal emit endpoint (POST /internal/emit) with internal API key auth
15. Worker entry point (workers/index.js)

Step 5 — Frontend:
16. ScanButton component + scan triggering logic
17. ScanProgressModal with Socket.io live updates (useSocket hook)
18. ScanResultsPage from 11_FRONTEND_UI_GUIDE.md (score circle, summary cards, findings list)
19. FindingCard component with expandable recommendation
20. VulnerabilitiesPage with filters from 11_FRONTEND_UI_GUIDE.md
21. VulnerabilityDetailModal with status change and notes

All scanner timeout handling from 06_SCANNER_INTEGRATION.md. 
Never let one failing tool crash the entire scan.
```

---

## Milestone 4 — Dashboard and Analytics

```
Build the dashboard and analytics (Milestone 4 from 07_BUILD_ORDER.md).

Backend:
1. GET /api/dashboard/summary endpoint from 05_API_REFERENCE.md
   - Return: totalWebsites, totalScans, openVulnerabilities, averageScore, websitesSummary, recentScans, scoreHistory
   - Optimize with Promise.all for parallel queries
   - Add MongoDB indexes from 04_DATABASE_SCHEMA.md

Frontend (all from 11_FRONTEND_UI_GUIDE.md):
1. DashboardPage — complete layout
2. StatCard component (4 instances: websites, open vulns, avg score, total scans)
3. ScoreTrendChart (Recharts LineChart) — one line per website, last 10 scans
4. RiskDistributionChart (Recharts PieChart) — critical/high/medium/low with severity colors
5. OWASPBreakdownChart (Recharts BarChart) — finding count per OWASP category A01-A10
6. WebsiteSummaryCard (mini version for dashboard grid)
7. RecentScansList (table of last 5 scans)
8. ScanHistoryPage (/websites/:websiteId/history) — AreaChart + scan table + CompareScanModal

Use OWASP_COLORS from 10_COMMON_PATTERNS.md for chart colors.
All charts must have tooltips and legends.
```

---

## Milestone 5 — AI Security Assistant

```
Build the AI Security Assistant (Milestone 5 from 07_BUILD_ORDER.md).

Backend:
1. ChatMessage model from 04_DATABASE_SCHEMA.md (with TTL index)
2. AI assistant service (services/ai/assistant.js):
   - Uses Anthropic SDK with claude-sonnet-4-6
   - buildSystemPrompt() function from 10_COMMON_PATTERNS.md
   - Sends last 10 messages of session as context
   - Returns { content, inputTokens, outputTokens }
3. AI message rate limiting: 20/day free, 200/day premium
   - Track aiMessagesUsedToday on User model
   - Reset daily via comparison with aiMessagesResetAt date
4. ChatController: sendMessage, getHistory, clearSession
5. Chat routes

Frontend (from 11_FRONTEND_UI_GUIDE.md):
1. AIAssistantPage — full chat interface
2. Context panel — select scan to attach (dropdown of user's recent scans)
3. MessageList — renders user + AI messages differently
4. AIMessage component — always shows "🤖 AI-Assisted Guidance" badge
   - Renders markdown using react-markdown
   - Code blocks with syntax highlighting using react-syntax-highlighter
5. MessageInput with send button and character limit
6. Suggested questions shown when chat is empty
7. Typing indicator animation while awaiting AI response
8. Usage counter "X/20 messages today" + "New Session" button
9. useChat custom hook encapsulating all chat logic

Ensure rate limit errors shown gracefully with upgrade prompt.
```

---

## Milestone 6 — AI Roadmap Generator

```
Build the AI Security Roadmap Generator (Milestone 6 from 07_BUILD_ORDER.md).

Backend:
1. Roadmap model from 04_DATABASE_SCHEMA.md
2. Roadmap generator service (services/ai/roadmapGenerator.js):
   - Takes scan findings + current score
   - Builds prompt that asks Claude to generate week-by-week plan
   - Response must be JSON: { weeks: [{ weekNumber, title, tasks: [{ taskId, title, description, impact, scoreImpact, linkedVulnIds }] }], projectedScore }
   - Parse and validate JSON response
   - Link tasks to actual vulnerability IDs where possible
3. RoadmapController: generate (idempotent — return existing if already generated), get, updateTask (mark complete)
4. Roadmap routes

Frontend (from 11_FRONTEND_UI_GUIDE.md):
1. "Generate Roadmap" button on ScanResultsPage (calls POST /api/roadmaps)
2. RoadmapPage at /roadmap/:scanId
3. Score projection header (current → projected with visual bar)
4. Week accordion — each week expandable
5. TaskItem with checkbox, impact badge, score impact, linked findings
6. Mark complete updates task + recalculates remaining projected improvement
7. Loading state while AI generates roadmap (takes 5-10 seconds)
```

---

## Milestone 7 — PDF Report Generation

```
Build PDF report generation (Milestone 7 from 07_BUILD_ORDER.md).

Backend:
1. Report model from 04_DATABASE_SCHEMA.md
2. HTML report template (views/reportTemplate.html or React component):
   - Sections from 01_PLATFORM_OVERVIEW.md F13:
     Cover page, Executive Summary, Score, Findings table, Detailed findings, OWASP summary, Recommendations, Checklist
   - Must look professional — use inline CSS, not Tailwind (Puppeteer doesn't load external CSS)
3. Report generator service (services/pdf/reportGenerator.js):
   - Fetch scan data + vulnerabilities + roadmap
   - Call Claude API for executive summary (~200 words, plain English)
   - Launch Puppeteer, navigate to /internal/report-template/:scanId
   - Print to PDF buffer
   - Upload to Cloudinary
   - Save Report document
4. Internal report template route: GET /internal/report-template/:scanId (auth: internal API key)
5. ReportController: generate (idempotent), get, getForScan
6. Report routes
7. Add to BullMQ as separate job type OR separate queue

Frontend:
1. "Generate PDF Report" button on ScanResultsPage
2. Generation progress state (via socket event report:complete)
3. ReportsPage at /reports — table of all generated reports
4. Download button per report

Set Puppeteer to no-sandbox mode for containerized environments:
{ args: ['--no-sandbox', '--disable-setuid-sandbox'] }
```

---

## Milestone 8 — Deep Scanner

```
Build the deep scanner with ZAP, Nuclei, and testssl.sh (Milestone 8 from 07_BUILD_ORDER.md).

Infrastructure:
1. Add ZAP Docker container to docker-compose.yml (profile: deep) from 10_COMMON_PATTERNS.md
2. Nuclei binary setup instructions in README
3. testssl.sh setup instructions in README

Backend:
1. ZAP runner (services/scanner/tools/zapRunner.js) from 06_SCANNER_INTEGRATION.md:
   - Uses ZAP REST API at ZAP_API_URL env var
   - Spider → passive scan → get alerts
   - Handles ZAP session creation and cleanup
2. testssl.sh runner (services/scanner/tools/testsslRunner.js) from 06_SCANNER_INTEGRATION.md:
   - Bash subprocess with --json output
   - Parse vulnerability findings
3. Nuclei runner (services/scanner/tools/nucleiRunner.js) from 06_SCANNER_INTEGRATION.md:
   - Binary subprocess with -json output
   - Templates: http/exposures/, http/misconfiguration/
   - -no-interactsh flag (required for SaaS use)
4. Extend normalizer with ZAP, testssl, Nuclei → unified schema mappings from 06_SCANNER_INTEGRATION.md
5. Extend scanWorker to run deep tools when type === 'deep'
6. Enforce in scan create controller: deep scan requires verified domain + premium tier

Frontend:
1. "Deep Scan" button variant (only shown for verified + premium)
2. Lock/upgrade icon on Deep Scan for free users → UpgradePrompt
3. Deep scan results differentiation (badge showing "Deep Scan" on results page)
4. Extend ScanProgressModal with deep scan stages (tls-vulns, active-scan, cve-check)
```

---

## Milestone 9 — Billing and Subscriptions

```
Build the complete Stripe subscription system (Milestone 9 from 07_BUILD_ORDER.md).

Backend:
1. Stripe service (services/stripe.js):
   - createCustomer(userId, email)
   - createCheckoutSession(customerId, priceId)
   - createPortalSession(customerId)
   - getSubscription(subscriptionId)
2. BillingController: createCheckout, createPortal, getSubscription
3. Stripe webhook handler at POST /webhooks/stripe:
   - MUST use express.raw() — register BEFORE express.json()
   - Verify signature with stripe.webhooks.constructEvent()
   - Handle: customer.subscription.created/updated/deleted, invoice.payment_failed/succeeded
   - Update User.subscription fields accordingly
4. Billing routes

Ensure free tier limits from 01_PLATFORM_OVERVIEW.md are all enforced in controllers:
- 3 websites max
- 3 baseline scans/day per website
- No deep scans
- 20 AI messages/day
- 1 PDF per scan

Frontend:
1. PricingPage from 11_FRONTEND_UI_GUIDE.md (two column: Free vs Premium)
2. BillingPage from 11_FRONTEND_UI_GUIDE.md (current plan, usage, manage button)
3. UpgradePrompt component — shown when hitting limits (reusable)
4. TrialBanner in sidebar — shows days remaining, disappears when subscribed
5. Stripe Checkout redirects to external Stripe page (no UI needed for checkout itself)
6. Success/cancel redirect pages (/billing/success, /billing/cancel)

Test with Stripe CLI: stripe listen --forward-to localhost:5000/webhooks/stripe
Use stripe trigger customer.subscription.created to test webhook handling.
```

---

## Milestone 10 — Polish Pass

```
Perform a complete polish and hardening pass (Milestone 10 from 07_BUILD_ORDER.md).

Security audit:
1. Review every API endpoint — does it have: auth middleware, Zod validation, ownership check, rate limiting?
2. Check no endpoint returns password, tokens, or internal IDs not belonging to user
3. Verify httpOnly cookie is set correctly on refresh token
4. Verify CORS is not wildcard
5. Verify helmet is configured with all headers from 09_SECURITY_RULES.md
6. List any endpoints that are missing rate limiting and add it

Frontend polish:
1. Add loading skeleton to every page that fetches data (not just spinners)
2. Add error states with retry buttons to every data-fetching page
3. Add empty states to: WebsitesPage, VulnerabilitiesPage, ReportsPage, AIAssistantPage
4. Add 404 page with navigation back to dashboard
5. Mobile responsive audit: check all pages on 375px width
6. Add missing aria-labels on all interactive elements

Performance:
1. Add React Query staleTime and cacheTime to all queries
2. Add MongoDB indexes from 04_DATABASE_SCHEMA.md (verify all exist)
3. Set BullMQ worker concurrency: 2 (don't overload server)

Testing:
1. Write tests for score engine (all test cases from 13_TESTING.md)
2. Write ownership check security tests from 13_TESTING.md
3. Run app against itself using its own scanner — fix any findings

Write a complete README.md with: project description, setup instructions, env vars, how to run, how to deploy.
```

---

## Useful Follow-Up Prompts

### When debugging a bug:
```
I'm getting this error in [file/route]:
[paste error]

Here's the relevant code:
[paste code]

I already tried: [what you tried]
```

### When asking for a specific component:
```
Build the [ComponentName] component. 
It should: [describe behavior]
It's used in: [page name] from 11_FRONTEND_UI_GUIDE.md
The data comes from: [API endpoint] from 05_API_REFERENCE.md
```

### When asking for a specific API endpoint:
```
Build the [HTTP method] [path] endpoint.
Full spec is in 05_API_REFERENCE.md.
The model schema is in 04_DATABASE_SCHEMA.md.
Apply the controller pattern from 10_COMMON_PATTERNS.md.
Include: Zod validation, auth middleware, ownership check, error handling.
```

### When asking for code review:
```
Review this code for:
1. Security issues (see 09_SECURITY_RULES.md)
2. Missing error handling
3. Performance issues
4. Consistency with patterns in 10_COMMON_PATTERNS.md

[paste code]
```

### When asking about architecture:
```
I need to decide how to implement [feature].
Context: [describe the situation]
Options I'm considering: A) [option] B) [option]
Which fits best with the architecture in 03_ARCHITECTURE.md?
```

---

## Tips for Getting Best Results

1. **One milestone per conversation** — don't mix milestones, Claude loses context
2. **Paste error messages verbatim** — never paraphrase errors
3. **Reference file names explicitly** — "from 06_SCANNER_INTEGRATION.md" tells Claude exactly what to check
4. **Ask for complete files** — "give me all files with complete code, not placeholders"
5. **After each milestone, test manually before continuing** — don't stack unfinished milestones
6. **If Claude gets confused**, start a fresh conversation and include: "I'm on Milestone X. Here's what's already built: [summary]. Now I need: [specific thing]."
