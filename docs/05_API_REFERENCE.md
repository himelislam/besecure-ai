# API Reference

Base URL: `/api`
All authenticated routes require: `Authorization: Bearer <accessToken>`
All responses follow: `{ success: boolean, data?: any, message?: string, error?: string }`

---

## Auth Routes — `/api/auth`

### POST /api/auth/register
**Body:** `{ name, email, password }`
**Response:** `{ message: "Verification email sent" }`
**Notes:** Sends verification email. Does NOT return a token — user must verify email first.

### POST /api/auth/login
**Body:** `{ email, password }`
**Response:** `{ accessToken, user: { _id, name, email, avatar, subscription, emailVerified } }`
**Side effect:** Sets httpOnly refresh token cookie
**Error cases:** 401 (wrong credentials), 403 (email not verified)

### POST /api/auth/logout
**Auth:** required
**Response:** `{ message: "Logged out" }`
**Side effect:** Clears httpOnly refresh cookie

### POST /api/auth/refresh
**Auth:** none — reads httpOnly cookie
**Response:** `{ accessToken }`
**Error:** 401 if cookie missing or invalid

### GET /api/auth/verify-email?token=<jwt>
**Response:** `{ message: "Email verified" }`
**Error:** 400 (token invalid/expired)

### POST /api/auth/forgot-password
**Body:** `{ email }`
**Response:** `{ message: "Reset link sent if email exists" }` (always 200 — don't reveal email existence)

### POST /api/auth/reset-password
**Body:** `{ token, newPassword }`
**Response:** `{ message: "Password updated" }`

### GET /api/auth/me
**Auth:** required
**Response:** `{ user: { _id, name, email, avatar, subscription, emailVerified, createdAt } }`

### PATCH /api/auth/me
**Auth:** required
**Body:** `{ name?, avatar? }` (avatar is Cloudinary URL after client-side upload)
**Response:** `{ user: <updated> }`

### POST /api/auth/change-password
**Auth:** required
**Body:** `{ currentPassword, newPassword }`
**Response:** `{ message: "Password changed" }`

---

## Website Routes — `/api/websites`

### GET /api/websites
**Auth:** required
**Response:** `{ websites: [{ _id, url, domain, nickname, verified, latestScore, latestGrade, lastScannedAt }] }`

### POST /api/websites
**Auth:** required
**Body:** `{ url, nickname }`
**Validation:** valid URL, accessible domain, not already added by this user
**Response:** `{ website: { _id, url, domain, nickname, verified: false, verificationToken, verificationInstructions: { dns, meta } } }`
**Error:** 400 (invalid URL), 409 (already exists), 403 (plan limit reached)

### GET /api/websites/:id
**Auth:** required
**Response:** `{ website: <full document> }`

### PATCH /api/websites/:id
**Auth:** required
**Body:** `{ nickname? }`
**Response:** `{ website: <updated> }`

### DELETE /api/websites/:id
**Auth:** required
**Response:** `{ message: "Website removed" }`
**Notes:** Soft delete only

### POST /api/websites/:id/verify
**Auth:** required
**Body:** `{ method: 'dns' | 'meta' }`
**Response:** `{ verified: boolean, message: string }`
**Notes:** Checks DNS TXT record or homepage meta tag; updates website.verified if found

---

## Scan Routes — `/api/scans`

### POST /api/scans
**Auth:** required
**Body:** `{ websiteId, type: 'baseline' | 'deep' }`
**Validation:**
- Website belongs to user
- type 'deep' requires verified domain
- type 'deep' requires premium subscription
- Daily scan limit not exceeded
**Response:** `{ scanId, status: "queued", position: <queue position> }`

### GET /api/scans/:id
**Auth:** required
**Response:** `{ scan: { _id, status, score, grade, findingCounts, owaspDistribution, startedAt, completedAt, type } }`
**Notes:** Polls for status if "running". Raw results NOT returned.

### GET /api/scans/:id/findings
**Auth:** required
**Response:** `{ vulnerabilities: [<vulnerability documents>] }`

### GET /api/websites/:websiteId/scans
**Auth:** required
**Query:** `?page=1&limit=20`
**Response:** `{ scans: [<scan summary>], total, page, pages }`
**Notes:** Scan history for a website, sorted newest first

### DELETE /api/scans/:id
**Auth:** required
**Notes:** Only if scan belongs to user; cannot delete running scans
**Response:** `{ message: "Scan deleted" }`

---

## Vulnerability Routes — `/api/vulnerabilities`

### GET /api/vulnerabilities
**Auth:** required
**Query:** `?websiteId=&status=&severity=&owaspCategory=&page=1&limit=20&sort=severity`
**Response:** `{ vulnerabilities: [<vulnerability documents>], total, page, pages }`

### GET /api/vulnerabilities/:id
**Auth:** required
**Response:** `{ vulnerability: <full document> }`

### PATCH /api/vulnerabilities/:id
**Auth:** required
**Body:** `{ status?, priority?, note? }` (note adds to notes array)
**Response:** `{ vulnerability: <updated> }`
**Notes:** Cannot directly set to "verified" — that's automatic on re-scan

### GET /api/vulnerabilities/stats
**Auth:** required
**Query:** `?websiteId=` (optional filter)
**Response:**
```json
{
  "byStatus": { "open": 5, "in_progress": 2, "fixed": 1 },
  "bySeverity": { "critical": 1, "high": 3, "medium": 3, "low": 1 },
  "byOwasp": { "A05": 4, "A03": 2, "A02": 2 }
}
```

---

## AI Chat Routes — `/api/chat`

### POST /api/chat/message
**Auth:** required
**Body:** `{ message, sessionId, attachedScanId? }`
**Rate limit:** 20/day (free), 200/day (premium)
**Response:** `{ reply: string, sessionId, inputTokens, outputTokens }`
**Notes:** Includes last 10 messages of session as context for Claude API call

### GET /api/chat/history
**Auth:** required
**Query:** `?sessionId=&limit=30`
**Response:** `{ messages: [{ role, content, createdAt }] }`

### DELETE /api/chat/session/:sessionId
**Auth:** required
**Response:** `{ message: "Session cleared" }`

---

## Roadmap Routes — `/api/roadmaps`

### POST /api/roadmaps
**Auth:** required
**Body:** `{ scanId }`
**Notes:** Generates roadmap via Claude API; stored in DB; returns existing if already generated
**Response:** `{ roadmap: <roadmap document> }`

### GET /api/roadmaps/:scanId
**Auth:** required
**Response:** `{ roadmap: <roadmap document> }`

### PATCH /api/roadmaps/:roadmapId/tasks/:taskId
**Auth:** required
**Body:** `{ completed: boolean }`
**Response:** `{ roadmap: <updated> }`

---

## Report Routes — `/api/reports`

### POST /api/reports
**Auth:** required
**Body:** `{ scanId }`
**Rate limit:** 1/scan (free), unlimited (premium)
**Response:** `{ reportId, status: "generating" }` or `{ reportId, status: "ready", downloadUrl }` if cached
**Notes:** Async generation; client polls or receives socket event

### GET /api/reports/:id
**Auth:** required
**Response:** `{ report: { _id, status, downloadUrl, createdAt } }`

### GET /api/reports/scan/:scanId
**Auth:** required
**Response:** `{ report: <document> }` or 404 if not generated

---

## Billing Routes — `/api/billing`

### POST /api/billing/create-checkout
**Auth:** required
**Response:** `{ checkoutUrl }` — Stripe hosted checkout URL
**Notes:** Creates Stripe customer if not exists; redirects to Stripe checkout

### POST /api/billing/create-portal
**Auth:** required
**Response:** `{ portalUrl }` — Stripe customer portal URL for managing subscription

### GET /api/billing/subscription
**Auth:** required
**Response:** `{ subscription: { status, plan, currentPeriodEnd, trialEnd } }`

---

## Stripe Webhook — `/webhooks/stripe`

**No auth** (verified via Stripe signature)
**Body:** Stripe webhook event

Handles events:
- `customer.subscription.created` → update user subscription status
- `customer.subscription.updated` → update status, period end
- `customer.subscription.deleted` → set to canceled
- `invoice.payment_failed` → set to past_due
- `invoice.payment_succeeded` → set to active

---

## Dashboard Route — `/api/dashboard`

### GET /api/dashboard/summary
**Auth:** required
**Response:**
```json
{
  "totalWebsites": 3,
  "totalScans": 47,
  "openVulnerabilities": 12,
  "averageScore": 73,
  "websitesSummary": [
    {
      "_id": "...",
      "nickname": "Main Site",
      "domain": "example.com",
      "latestScore": 87,
      "latestGrade": "A",
      "lastScannedAt": "...",
      "openVulnCount": 2
    }
  ],
  "recentScans": [<last 5 scans across all websites>],
  "scoreHistory": [<last 10 scan scores per website, for chart>]
}
```

---

## Internal Routes (Not exposed to clients)

### POST /internal/emit
Used by worker to push socket events through API server
**Body:** `{ room: string, event: string, data: object }`
**Auth:** Internal API key header (not JWT — only called server-to-server)

### GET /internal/report-template/:scanId
Renders HTML template for Puppeteer PDF generation
**Auth:** Internal API key header

---

## Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

**Error codes used:**
- `INVALID_INPUT` — Zod validation failed
- `UNAUTHORIZED` — not logged in
- `FORBIDDEN` — logged in but not allowed
- `NOT_FOUND` — resource doesn't exist or doesn't belong to user
- `PLAN_LIMIT_REACHED` — exceeded free tier limit
- `DOMAIN_NOT_VERIFIED` — tried deep scan on unverified domain
- `SCAN_IN_PROGRESS` — tried to start scan when one is already running
- `RATE_LIMITED` — too many requests
- `INTERNAL_ERROR` — unexpected server error (no details in production)
