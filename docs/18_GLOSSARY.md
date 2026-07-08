# Quick Reference Glossary

All terms, abbreviations, OWASP categories, scanner outputs, and conventions used in this project.
Reference this when you see an unfamiliar term in code, scan results, or documentation.

---

## OWASP Top 10 (2021) — Full Reference

| Code | Name | What It Means | Example in This Platform |
|---|---|---|---|
| A01 | Broken Access Control | Users can access data/actions they shouldn't | Missing auth on API endpoints |
| A02 | Cryptographic Failures | Weak or missing encryption | SSL 2.0 still enabled, expired certificate, HTTP instead of HTTPS |
| A03 | Injection | Attacker injects malicious code/commands | XSS (script injection), SQL injection, CRLF injection |
| A04 | Insecure Design | Architectural security flaws | No rate limiting, predictable IDs, no domain verification |
| A05 | Security Misconfiguration | Servers/apps not securely configured | Missing security headers, ZAP finding about error messages |
| A06 | Vulnerable and Outdated Components | Using software with known CVEs | Nuclei finding: outdated WordPress version |
| A07 | Identification and Authentication Failures | Auth weaknesses | Missing HSTS (allows credential theft), insecure cookies |
| A08 | Software and Data Integrity Failures | Code/data integrity not verified | Missing Subresource Integrity (SRI) on external scripts |
| A09 | Security Logging and Monitoring Failures | Not detecting/logging attacks | Information disclosure (reveals internal structure) |
| A10 | Server-Side Request Forgery (SSRF) | Server makes requests to attacker-controlled URLs | Open redirect vulnerabilities |

---

## Security Header Glossary

| Header | What It Does | Detected By |
|---|---|---|
| Content-Security-Policy (CSP) | Restricts which resources the browser can load; prevents XSS | Observatory |
| Strict-Transport-Security (HSTS) | Forces HTTPS; prevents protocol downgrade attacks | Observatory, ZAP |
| X-Frame-Options | Prevents site from being loaded in iframes; prevents clickjacking | Observatory |
| X-Content-Type-Options | Prevents MIME type sniffing; always use `nosniff` | Observatory |
| Referrer-Policy | Controls what referrer info is sent with requests | Observatory |
| Permissions-Policy | Restricts access to browser APIs (camera, microphone, etc.) | Observatory |
| Cross-Origin-Opener-Policy (COOP) | Isolates browsing contexts; prevents Spectre-style attacks | Observatory |
| Cross-Origin-Resource-Policy (CORP) | Restricts cross-origin loading of resources | Observatory |
| Subresource Integrity (SRI) | Ensures external scripts haven't been tampered with | Observatory |

---

## SSL/TLS Terminology

| Term | Meaning |
|---|---|
| SSL 2.0 / SSL 3.0 | Very old, broken protocols — should NEVER be enabled (detected as critical) |
| TLS 1.0 / TLS 1.1 | Old TLS versions — deprecated, should be disabled (detected as high) |
| TLS 1.2 | Acceptable but TLS 1.3 preferred |
| TLS 1.3 | Current standard — should be enabled |
| Certificate chain | The sequence of certificates from the site cert → intermediate CA → root CA |
| Self-signed cert | Certificate not signed by a trusted CA — triggers browser warnings |
| Let's Encrypt | Free, trusted certificate authority — most common for small sites |
| Cipher suite | Algorithm combination used to encrypt the connection (e.g., AES-256-GCM) |
| Heartbleed | Famous vulnerability in OpenSSL (CVE-2014-0160) — testssl.sh checks for this |
| POODLE | SSL 3.0 vulnerability — testssl.sh checks for this |
| BEAST | TLS 1.0 vulnerability — testssl.sh checks for this |
| CRIME/BREACH | TLS compression vulnerabilities — testssl.sh checks for these |

---

## Cookie Security Flags

| Flag | What It Does | If Missing |
|---|---|---|
| `Secure` | Cookie only sent over HTTPS | Can be stolen over HTTP |
| `HttpOnly` | JavaScript cannot access the cookie | XSS can steal the cookie |
| `SameSite=Strict` | Cookie not sent on cross-site requests | Vulnerable to CSRF |
| `SameSite=Lax` | Cookie sent on top-level navigation only | Partially CSRF protected |
| `SameSite=None` | Cookie sent everywhere (requires Secure) | Full CSRF exposure |

---

## Vulnerability Statuses

| Status | Meaning | Set By |
|---|---|---|
| `open` | Newly detected, not yet acted on | Scanner (automatic on detection) |
| `assigned` | Someone is responsible for it | User manual action |
| `in_progress` | Actively being worked on | User manual action |
| `fixed` | User believes it's been fixed | User manual action |
| `verified` | Re-scan confirmed the fix — issue no longer detected | Scanner (automatic on re-scan) |
| `closed` | Acknowledged and closed (may or may not be fixed) | User manual action |
| `false_positive` | Automated scan incorrectly flagged this | User manual action |

---

## Scan Types

| Type | What Runs | Requires | Risk Level |
|---|---|---|---|
| `baseline` | Observatory + SSLyze only | Any user, any domain | Low — no attack payloads |
| `deep` | baseline + ZAP active + testssl.sh + Nuclei | Verified domain + Premium | Medium — sends attack-like payloads |

---

## Scanner Tool Reference

| Tool | What It Tests | Output Used For |
|---|---|---|
| MDN HTTP Observatory | Security headers, cookies, CSP, HSTS, SRI | Header analysis section |
| SSLyze | SSL/TLS certificate and cipher suites | SSL analysis section |
| testssl.sh | TLS vulnerabilities (Heartbleed, POODLE, etc.) | Deep TLS vulnerability findings |
| OWASP ZAP | Active web app scanning: XSS, SQLi, open redirects | Active finding section |
| Nuclei | Template-based CVE and misconfiguration checks | CVE/exposure findings |

---

## Score and Grade Reference

| Score Range | Grade | Risk Level | Color |
|---|---|---|---|
| 95–100 | A+ | Low | Green |
| 85–94 | A | Low | Green |
| 70–84 | B | Low | Yellow-green |
| 50–69 | C | Medium | Yellow |
| 30–49 | D | High | Orange |
| 0–29 | F | Critical | Red |

**Deductions per finding severity:**
- Critical: -20 points
- High: -10 points
- Medium: -5 points
- Low: -2 points
- Info: -0 points (no deduction)

---

## Tech Stack Abbreviations

| Abbreviation | Meaning |
|---|---|
| MERN | MongoDB, Express.js, React.js, Node.js |
| JWT | JSON Web Token — used for auth |
| CORS | Cross-Origin Resource Sharing — browser security policy |
| CSR | Client-Side Rendering — how React apps work |
| SSR | Server-Side Rendering — not used in this project |
| REST | Representational State Transfer — API style used |
| ODM | Object Document Mapper — Mongoose is the ODM for MongoDB |
| ESM | ECMAScript Modules — the `import`/`export` syntax (used throughout) |
| CJS | CommonJS Modules — the `require()`/`module.exports` syntax (NOT used) |
| TTL | Time To Live — MongoDB index that auto-deletes documents after a time period |
| SaaS | Software as a Service — the business model |

---

## API Conventions

| Convention | Detail |
|---|---|
| All responses | `{ success: boolean, data?: any, message?: string, error?: string }` |
| Auth header | `Authorization: Bearer <accessToken>` |
| Refresh token | httpOnly cookie named `refreshToken` |
| Rate limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Pagination | `?page=1&limit=20` → response: `{ data, total, page, pages }` |
| Soft delete | `isDeleted: true` — never hard-delete user data |
| Timestamps | All MongoDB documents have `createdAt` and `updatedAt` (via Mongoose timestamps option) |
| ObjectId | MongoDB's default `_id` type — 24-character hex string |

---

## File/Folder Name Conventions

| Convention | Example |
|---|---|
| Models | PascalCase: `User.js`, `Scan.js`, `Vulnerability.js` |
| Controllers | camelCase: `authController.js`, `scanController.js` |
| Routes | camelCase: `auth.js`, `websites.js` |
| Services | camelCase in subfolder: `services/ai/assistant.js` |
| React Pages | PascalCase: `DashboardPage.jsx`, `ScanResultsPage.jsx` |
| React Components | PascalCase: `WebsiteCard.jsx`, `SeverityBadge.jsx` |
| React Hooks | camelCase with `use` prefix: `useWebsites.js`, `useSocket.js` |
| Zustand stores | camelCase with `Store` suffix: `authStore.js`, `scanStore.js` |
| Zod schemas | camelCase: `websiteSchemas.js`, `authSchemas.js` |
| Environment vars | SCREAMING_SNAKE_CASE: `JWT_ACCESS_SECRET`, `MONGODB_URI` |
| Vite env vars | `VITE_` prefix: `VITE_API_URL`, `VITE_SOCKET_URL` |

---

## BullMQ / Queue Reference

| Term | Meaning |
|---|---|
| Queue | A named list of jobs waiting to be processed |
| Worker | A process that picks up jobs from a queue and processes them |
| Job | A single unit of work (e.g., one scan) with data payload |
| `active` | Job is currently being processed |
| `waiting` | Job is in queue, not yet picked up |
| `completed` | Job finished successfully |
| `failed` | Job threw an error |
| Concurrency | How many jobs one worker processes simultaneously (set to 2) |
| Attempts | How many times to retry a failed job (set to 1 — don't retry scans) |
| `removeOnComplete` | Auto-remove job records from Redis after completion (set to last 100) |

---

## Anthropic / Claude API Reference

| Term | Meaning |
|---|---|
| `claude-sonnet-4-6` | The model used in this platform (good balance of quality and cost) |
| `max_tokens` | Maximum tokens in the response (1024 for chat, 2048 for roadmap) |
| `system` | The system prompt — sets Claude's role and instructions |
| `messages` | The conversation history array `[{ role, content }]` |
| `usage.input_tokens` | Tokens consumed by the prompt (system + history + user message) |
| `usage.output_tokens` | Tokens consumed by the response |
| Prompt caching | Anthropic feature that caches the system prompt to reduce costs |
| `cache_control: { type: 'ephemeral' }` | How to enable prompt caching on a message block |
| Streaming | Getting the response token by token instead of waiting for full response |

---

## Domain Verification Reference

| Method | How It Works | User Action Required |
|---|---|---|
| DNS TXT Record | Platform checks DNS records for a specific TXT entry | Add TXT record in DNS registrar (GoDaddy, Namecheap, Cloudflare, etc.) |
| HTML Meta Tag | Platform fetches homepage and checks for a specific meta tag | Add `<meta>` tag to site's `<head>` and redeploy |

**Token format:** `sav-verify-` + UUID (e.g., `sav-verify-a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**DNS record format:**
```
Type:  TXT
Name:  _security-audit-verify.yourdomain.com
Value: sav-verify-a1b2c3d4-e5f6-7890-abcd-ef1234567890
TTL:   300
```

**HTML meta tag format:**
```html
<meta name="security-audit-verify" content="sav-verify-a1b2c3d4-e5f6-7890-abcd-ef1234567890">
```

---

## Stripe Reference

| Term | Meaning |
|---|---|
| Customer | A Stripe entity representing a user who has or may have a subscription |
| Product | What you're selling ("Premium Plan") |
| Price | The recurring cost of the product ($X/month) — has a `price_` ID |
| Subscription | An active recurring payment relationship |
| Checkout Session | A hosted payment page on Stripe's servers |
| Customer Portal | Stripe's hosted page for managing/canceling subscriptions |
| Webhook | Stripe sends events to your server when things happen (payment succeeded, etc.) |
| `sk_test_` | Test mode secret key — safe to use, no real charges |
| `sk_live_` | Live mode secret key — real money, only in production |
| `whsec_` | Webhook signing secret — used to verify events are from Stripe |

---

## Cloudinary Reference

| Term | Meaning |
|---|---|
| Public ID | Cloudinary's identifier for an uploaded file |
| Secure URL | HTTPS URL to access the file |
| `resource_type` | `image` for images/avatars, `raw` for PDFs |
| Upload preset | Pre-configured upload settings (folder, transformations, etc.) |
| Transformation | On-the-fly image processing (resize, crop, format) — used for avatars |

---

## Error Code Reference

| Code | HTTP Status | When Used |
|---|---|---|
| `INVALID_INPUT` | 400 | Zod validation failed |
| `UNAUTHORIZED` | 401 | No valid auth token |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource not found or not yours |
| `PLAN_LIMIT_REACHED` | 403 | Free tier limit hit |
| `DOMAIN_NOT_VERIFIED` | 403 | Deep scan without verified domain |
| `SCAN_IN_PROGRESS` | 409 | Scan already running for this website |
| `RATE_LIMITED` | 429 | Too many requests |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `AI_UNAVAILABLE` | 503 | Claude API error |
| `AI_PARSE_ERROR` | 500 | Claude returned invalid JSON (roadmap) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
