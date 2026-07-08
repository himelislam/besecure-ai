# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  React 18 + Vite                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Pages   │ │ Recharts │ │  Zustand │ │  Socket.io-client│  │
│  │  + React │ │ Dashboard│ │  (state) │ │  (scan updates)  │  │
│  │  Query   │ └──────────┘ └──────────┘ └──────────────────┘  │
│  └──────────┘                                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS + WSS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER LAYER                             │
│  Node.js 20 + Express.js                                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Middleware Stack                                         │   │
│  │ helmet → cors → morgan → express-rate-limit → auth JWT  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Routes:                                                         │
│  /api/auth      → AuthController                                │
│  /api/websites  → WebsiteController                             │
│  /api/scans     → ScanController                                │
│  /api/vulns     → VulnerabilityController                       │
│  /api/chat      → AIAssistantController                         │
│  /api/reports   → ReportController                              │
│  /api/billing   → StripeController                              │
│  /webhooks/stripe → StripeWebhookController                     │
│                                                                  │
│  Socket.io server (scan:progress, scan:complete events)         │
└──────┬──────────────┬──────────────────────────────────────────┘
       │              │
       │              │ BullMQ jobs
       ▼              ▼
┌──────────┐  ┌──────────────────────────────────────────────────┐
│ MongoDB  │  │              WORKER LAYER                         │
│          │  │  (Separate Node.js process)                       │
│ Users    │  │                                                    │
│ Websites │  │  BullMQ Worker (scanQueue)                        │
│ Scans    │  │       │                                           │
│ Vulns    │  │       ▼                                           │
│ Chat     │  │  ScanOrchestrator.js                              │
│ Reports  │  │       │                                           │
└──────────┘  │       ├── [baseline] observatoryRunner.js         │
              │       ├── [baseline] sslyzeRunner.js              │
              │       ├── [deep] zapRunner.js (via Docker API)    │
              │       ├── [deep] testsslRunner.js (subprocess)    │
              │       └── [deep] nucleiRunner.js (subprocess)     │
              │                                                    │
              │       ▼                                           │
              │  normalizer.js (unified finding schema)           │
              │       ▼                                           │
              │  scoreEngine.js (calculate score)                 │
              │       ▼                                           │
              │  Save to MongoDB                                   │
              │       ▼                                           │
              │  Emit socket event → API Server → Client          │
              └──────────────────────────────────────────────────┘
                      │
                      │ subprocess / Docker API
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SCANNER TOOL LAYER                            │
│  (Docker containers or system subprocesses)                     │
│                                                                  │
│  ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ OWASP ZAP │ │MDN Observatory│ │  SSLyze  │ │  testssl.sh │  │
│  │ Docker    │ │ npm package  │ │ Python   │ │    Bash     │  │
│  │ container │ │ (in-process) │ │subprocess│ │  subprocess │  │
│  └───────────┘ └──────────────┘ └──────────┘ └─────────────┘  │
│                         ┌──────────┐                            │
│                         │  Nuclei  │                            │
│                         │  Binary  │                            │
│                         └──────────┘                            │
└─────────────────────────────────────────────────────────────────┘

External Services:
┌─────────┐ ┌───────────┐ ┌────────────┐ ┌─────────────────────┐
│  Redis  │ │Cloudinary │ │Claude API  │ │  Stripe             │
│(BullMQ +│ │(PDFs +    │ │(AI assist +│ │(Subscriptions +     │
│ rate    │ │ avatars)  │ │ roadmap)   │ │ webhooks)           │
│ limits) │ └───────────┘ └────────────┘ └─────────────────────┘
└─────────┘
```

---

## Scan Lifecycle (Detailed Flow)

```
User clicks "Start Scan"
        │
        ▼
POST /api/scans
  - Validate user auth ✓
  - Check subscription limits ✓
  - Check domain ownership (verified?) ✓
  - Create Scan document (status: "queued") in MongoDB
  - Add job to BullMQ scanQueue with { scanId, websiteId, userId, scanType }
  - Return { scanId, status: "queued" }
        │
        ▼
Frontend subscribes to socket event for this scanId
        │
        ▼
BullMQ Worker picks up job
        │
        ├── Update scan status: "running"
        ├── Emit scan:progress { scanId, stage: "starting", progress: 0 }
        │
        ├── Run Observatory (baseline always)
        │   └── Emit scan:progress { stage: "headers", progress: 20 }
        │
        ├── Run SSLyze (baseline always)
        │   └── Emit scan:progress { stage: "ssl", progress: 40 }
        │
        ├── [if deep scan] Run testssl.sh
        │   └── Emit scan:progress { stage: "tls-vulns", progress: 55 }
        │
        ├── [if deep scan] Run ZAP active scan
        │   └── Emit scan:progress { stage: "active-scan", progress: 75 }
        │
        ├── [if deep scan] Run Nuclei
        │   └── Emit scan:progress { stage: "cve-check", progress: 90 }
        │
        ├── Normalize all raw outputs → unified finding schema
        ├── Calculate security score
        ├── Create Vulnerability documents (new findings)
        ├── Auto-verify previously "Fixed" vulnerabilities
        ├── Update Scan document (status: "complete", score, findings)
        │
        └── Emit scan:complete { scanId, score, grade, findingCount }
                │
                ▼
        Frontend receives event → React Query invalidates scan cache
        → Results page updates automatically
```

---

## Authentication Flow

```
Register:
  POST /api/auth/register
  → Hash password (bcrypt, 12 rounds)
  → Create User (emailVerified: false)
  → Send verification email with signed JWT link
  → Return { message: "Check your email" }

Verify Email:
  GET /api/auth/verify-email?token=<jwt>
  → Verify token, set emailVerified: true
  → Return success

Login:
  POST /api/auth/login
  → Validate credentials
  → Generate accessToken (15min, JWT, in response body)
  → Generate refreshToken (7 days, JWT, in httpOnly cookie)
  → Return { accessToken, user }

Authenticated Requests:
  All protected routes:
  → Check Authorization: Bearer <accessToken>
  → If expired → client calls POST /api/auth/refresh
  → Refresh endpoint reads httpOnly cookie, issues new accessToken
  → Axios interceptor handles this automatically

Logout:
  POST /api/auth/logout
  → Clear httpOnly refresh cookie
  → Client deletes accessToken from memory
```

---

## Domain Verification Flow

```
User adds website (e.g., example.com):
  POST /api/websites
  → Generate unique verificationToken
  → Store in Website document
  → Return token + both verification methods

User chooses DNS method:
  "Add TXT record: _security-audit-verify.example.com → <token>"

OR user chooses HTML method:
  "Add <meta name='security-audit-verify' content='<token>'> to your homepage"

User clicks "Check Verification":
  POST /api/websites/:id/verify
  → Platform checks DNS TXT records via dns.promises.resolveTxt()
  → OR fetches homepage and checks meta tags
  → If found: set verified: true, verifiedAt: Date.now()
  → Return { verified: true }
  → User can now trigger deep scans
```

---

## Real-Time Socket Architecture

```
API Server (Socket.io):
- On connection: authenticate via query token or cookie
- Join room: socket.join(`user:${userId}`)

Worker (after completing scan stages):
- Imports socket server instance OR uses Redis pub/sub to relay events
- Emits to room: io.to(`user:${userId}`).emit('scan:progress', { ... })

Frontend:
- useEffect → socket.on('scan:progress', handler)
- handler updates React Query cache directly
- On scan:complete → full cache invalidation + navigate to results
```

**Important:** The worker runs in a separate process. To emit Socket.io events from the worker:
- Option A (simpler): Worker sends HTTP POST to internal API endpoint `/internal/emit`, API server emits
- Option B (more scalable): Use Redis Pub/Sub — worker publishes to Redis channel, API server subscribes and emits
- **Recommend Option A for MVP** — easier to implement and debug

---

## PDF Generation Flow

```
User clicks "Generate Report" on scan results page:
  POST /api/reports (scanId)
  → Auth check ✓
  → Subscription check (free: 1/scan, premium: unlimited) ✓
  → Check if report already exists for this scan → return cached URL
  → If no existing: enqueue PDF generation job (BullMQ)
  → Return { status: "generating", reportId }

PDF Worker job:
  → Fetch full scan data + AI roadmap from MongoDB
  → Call Claude API to generate executive summary (~200 words)
  → Render HTML report template (Express serves a hidden /internal/report-template/:scanId route)
  → Puppeteer: launch browser, navigate to template URL, print to PDF
  → Upload PDF buffer to Cloudinary
  → Save Report document (cloudinaryUrl, scanId)
  → Emit report:complete event via socket
  → Return download URL to frontend
```

---

## Subscription Middleware

Every protected API route passes through `checkSubscription` middleware after auth:

```
checkSubscription middleware:
  → Fetch user.subscription from DB (or Redis cache for performance)
  → If subscription.status === 'active' → req.tier = 'premium', continue
  → If subscription.status === 'trialing' and trialEnd > now → req.tier = 'premium', continue  
  → Else → req.tier = 'free'
  → Attach to req for controllers to check limits

Controllers use req.tier to enforce:
  - Scan type limits (no deep scans on free)
  - Scan count limits
  - AI message limits
  - PDF generation limits
```

---

## Error Handling Architecture

All errors flow through a single Express error handler:

```javascript
// All async controllers use this pattern:
export const myController = async (req, res, next) => {
  try {
    // logic
  } catch (error) {
    next(error); // always pass to error handler
  }
};

// Central error handler (middleware/errorHandler.js):
// - Mongoose ValidationError → 400
// - JWT errors → 401
// - Custom AppError class → use its statusCode
// - Everything else → 500
// - Never expose stack traces in production
// - Log all 5xx errors to Winston
```

---

## Security Architecture (Platform Protects Itself)

The platform must practice what it preaches. Non-negotiable protections:

| Layer | Protection |
|---|---|
| HTTP | helmet.js (sets all security headers the platform checks for in user sites) |
| Auth | bcrypt (12 rounds), JWT short-lived, refresh in httpOnly cookie |
| Input | Zod validation on every request body and query param |
| Database | Mongoose schema validation + parameterized queries (no raw string building) |
| Rate Limiting | express-rate-limit on all routes, Redis-backed for distributed rate limiting |
| File Upload | Cloudinary only (no local file storage), file type whitelist |
| Secrets | dotenv + never logged + .env.example has no real values |
| CORS | Whitelist only (client origin) — no wildcard in production |
| Scanner Isolation | All scanner tools run in Docker containers or subprocesses — never in main API process |
| Logging | Winston with explicit exclusions for passwords, tokens, API keys |
