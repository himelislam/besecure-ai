# Platform Overview — AI-Powered Web Security Audit Platform

## One-Line Description
A SaaS platform where website owners register their sites, run automated security scans, get AI-generated remediation guidance, track vulnerabilities over time, and learn cybersecurity concepts — all from one dashboard.

## Target Users
- Individual developers who own websites and don't have a security background
- Small business owners with web presence
- Junior/mid developers who want to improve their site's security posture
- Development teams who want lightweight continuous security monitoring without enterprise-grade pricing

---

## MVP Features (Build These First — Phase 1)

### F01 — User Authentication and Account Management
- Register with email + password
- Email verification (must verify before scanning)
- Login / Logout
- Forgot password → email reset link
- Change password (authenticated)
- Profile management (name, avatar via Cloudinary)
- JWT access + refresh token flow
- Google OAuth (optional but recommended for UX)

**What's NOT in MVP:** Team/org accounts, SSO, 2FA (add in Phase 2)

---

### F02 — Website Asset Management
- Add a website (URL + nickname)
- List all websites in dashboard
- Delete a website (soft delete, keep historical data)
- Domain verification system — required before active scans:
  - Method 1: DNS TXT record (user adds `_security-audit-verify=<token>` to their DNS)
  - Method 2: HTML meta tag (user adds `<meta name="security-audit-verify" content="<token>">`)
  - Platform polls/checks verification on demand
- Verification status shown per website (Unverified / Verified)
- Max websites: 3 (free), unlimited (premium)

---

### F03 — Automated Website Security Scanner
Two scan modes:
- **Baseline Scan** (available to all verified + unverified domains): passive only — no attack payloads sent. Uses HTTP Observatory + SSL checks + header inspection via plain HTTP requests.
- **Deep Scan** (verified domains only, premium feature): adds ZAP active scan + Nuclei templates + full testssl.sh vulnerability check.

Scan is always async:
1. User triggers scan → POST /api/scans → returns `{ scanId, status: "queued" }`
2. Scan job goes into BullMQ queue
3. Worker picks it up, runs tools, normalizes output
4. Socket.io event pushed to user: `scan:progress`, `scan:complete`, `scan:failed`
5. Frontend updates in real time

Scan rate limits:
- Free: 3 baseline scans per day per website
- Premium: unlimited scans + deep scans

Checks performed (baseline):
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Cookie flags (Secure, HttpOnly, SameSite)
- HTTPS availability and redirect from HTTP
- SSL certificate validity and expiry
- Basic information disclosure (server banner, X-Powered-By)

Checks performed (deep, verified domains only):
- Full TLS vulnerability scan (Heartbleed, POODLE, BEAST, CRIME, BREACH, etc.)
- XSS risk detection (ZAP active)
- SQL injection indicators (ZAP active + Nuclei)
- Open redirect detection
- Known CVE checks (Nuclei templates)
- Exposed sensitive files (.git, .env, backup files)

---

### F04 — Security Header Analysis
- Per-header pass/fail/warning result
- What the header does (plain English)
- What value was found (or "missing")
- Recommended value with explanation
- OWASP mapping per finding

Headers checked:
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

---

### F05 — SSL and HTTPS Analysis
- Certificate valid? (yes/no)
- Certificate expiry date + days remaining
- Certificate issuer
- HTTPS available?
- HTTP → HTTPS redirect working?
- TLS version(s) supported
- Weak cipher suites detected (deep scan only)
- Known TLS vulnerabilities (deep scan only)

---

### F06 — OWASP Top 10 Mapping
Every finding is tagged with an OWASP Top 10 (2021) category:
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection (XSS, SQLi)
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable and Outdated Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Security Logging and Monitoring Failures
- A10: Server-Side Request Forgery

The UI shows a breakdown by OWASP category (chart + list).

---

### F07 — Security Score Engine
Score calculated from scan results:
- Base score: 100
- Deductions per finding: Critical (-20), High (-10), Medium (-5), Low (-2), Info (-0)
- Grade thresholds: A+ (95-100), A (85-94), B (70-84), C (50-69), D (30-49), F (<30)
- Score is stored per scan and tracked over time

Score calculation is done in `/services/scoring/scoreEngine.js` — deterministic, not AI-based.

---

### F08 — AI-Powered Security Assistant (Chat)
- Persistent chat interface in the UI (right sidebar or dedicated page)
- Context-aware: user can "attach" a scan result to the conversation
- Claude API (claude-sonnet-4-6) powers responses
- System prompt includes: user's scan findings, website context, OWASP definitions
- Capabilities:
  - Explain any vulnerability in plain English
  - Explain why it's dangerous
  - Provide fix instructions for specific tech stacks (React, PHP, WordPress, etc.)
  - Generate sample code for fixes
  - Answer general cybersecurity questions
- Chat history stored in DB per user (last 30 messages retained)
- Rate limited: 20 messages/day (free), 200/day (premium)
- All responses prefixed in UI with "AI-Assisted Guidance" badge

---

### F09 — AI Security Roadmap Generator
- Triggered from scan results page ("Generate My Security Roadmap")
- Sends normalized scan findings to Claude API
- Claude generates a week-by-week prioritized remediation plan
- Output format:
  - Week N: [Fix Title] — [Why / Impact] — [How to do it]
  - Estimated score improvement per step
  - Total expected score before/after
- Roadmap stored in DB, linked to scan
- User can mark steps as "Done"
- One roadmap per scan (regenerable)

---

### F10 — Vulnerability Management System
- Each finding from a scan becomes a "vulnerability record"
- Status workflow: Open → Assigned → In Progress → Fixed → Verified → Closed
- User can:
  - Change status
  - Add notes/comments per vulnerability
  - Set priority (Critical / High / Medium / Low)
  - Assign to self (MVP) or team member (Phase 2)
- Filter/sort vulnerabilities by: status, severity, OWASP category, website, date
- Re-scan triggers automatic status check: if a "Fixed" vuln is no longer detected, it moves to "Verified"

---

### F11 — Dashboard and Analytics
Main dashboard shows:
- Security score trend (line chart, last 10 scans)
- Risk distribution (pie chart: Critical/High/Medium/Low)
- OWASP category breakdown (bar chart)
- Total scans run (all time)
- Open vulnerabilities count
- Websites monitored
- Most recent scan per website (card with score + grade + date)
- Quick action: "Scan Now" per website

All charts use Recharts.

---

### F12 — Historical Security Tracking
- Every scan result stored permanently (soft-delete only)
- "History" page per website showing:
  - Score over time (line chart)
  - Table of all scans: date, score, grade, finding counts
  - Click any scan → see full results for that scan
- "Compare" feature: select two scans → side-by-side diff of findings

---

### F13 — PDF Security Report Generation
Generated via Puppeteer (renders HTML template to PDF).
Report sections:
1. Cover page (website, date, score, grade)
2. Executive Summary (plain English, AI-generated)
3. Security Score breakdown
4. Vulnerability Findings table (severity, OWASP, status)
5. Detailed findings (one page per Critical/High finding)
6. OWASP compliance summary
7. AI Recommendations (from roadmap generator)
8. Remediation checklist

PDF stored in Cloudinary, download link returned to user.
Free users: 1 PDF per scan. Premium: unlimited.

---

### F14 — Free Trial and Subscription (Stripe)
- All new users get 14-day free trial with full platform access
- Trial limits enforced after expiry:
  - Free tier: 3 baseline scans/day, 3 websites, 20 AI messages/day, 1 PDF/scan
  - Premium tier: unlimited everything + deep scans
- Stripe handles billing (subscription create, update, cancel, webhook events)
- Subscription status stored in DB and checked on every protected route via middleware

---

## Phase 2 Features (Do NOT build in MVP — reference only)
- Team/org accounts with role-based access
- 2FA / TOTP
- Browser extension
- Mobile app
- Real-time continuous monitoring (scheduled cron scans)
- ML-based risk prediction
- Enterprise dashboard
- Automated compliance auditing (SOC2, ISO 27001)
- Slack/Teams integration for vulnerability alerts
- API access for CI/CD pipeline integration

---

## Key Business Rules
1. A domain must be verified before deep/active scans run — no exceptions
2. If a user deletes a website, their scan history is soft-deleted (not permanently removed for 90 days)
3. Scan findings are advisory — the platform makes no guarantee of completeness
4. AI responses must never claim to be a certified security professional
5. All scan-triggering UI must show a disclaimer: "Automated scanning only. Results may include false positives. Not a substitute for professional penetration testing."
6. Users are responsible for ensuring they have authorization to scan their listed domains
7. Terms of Service must include acceptable use policy (no scanning third-party sites)
