# CLAUDE.md — AI-Powered Web Security Audit Platform

> Claude Code reads this file automatically at the start of every session.
> This is the single source of truth for how to build this project.

---

## What This Is

A SaaS platform where users register websites, run automated security scans, get
AI-generated remediation guidance, track vulnerabilities over time, and learn cybersecurity.

**Stack:** Node.js 20 + Express + MongoDB + Redis + React 18 + Vite  
**AI:** Anthropic Claude API (`claude-sonnet-4-6`)  
**Queue:** BullMQ + Redis  
**Scanners:** MDN Observatory, SSLyze, OWASP ZAP, Nuclei, testssl.sh  
**Billing:** Stripe  
**Files:** Cloudinary  

---

## Project Folder Structure

```
/
├── server/                  ← Node.js + Express backend
│   ├── config/              ← DB, Redis, Cloudinary, Stripe, Socket.io init
│   ├── controllers/         ← Route handler logic
│   ├── middleware/          ← auth, rateLimiter, errorHandler, checkSubscription
│   ├── models/              ← Mongoose models
│   ├── routes/              ← Express routers
│   ├── schemas/             ← Zod validation schemas
│   ├── services/
│   │   ├── ai/              ← Claude API: assistant.js, roadmapGenerator.js
│   │   ├── email/           ← Nodemailer/Resend wrappers + templates
│   │   ├── pdf/             ← Puppeteer report generator
│   │   ├── queue/           ← BullMQ: scanQueue.js, scanWorker.js, reportQueue.js
│   │   └── scanner/
│   │       ├── tools/       ← observatoryRunner.js, sslyzeRunner.js, zapRunner.js, nucleiRunner.js, testsslRunner.js
│   │       ├── normalizer.js
│   │       └── orchestrator.js
│   ├── scoring/             ← scoreEngine.js (deterministic, no AI)
│   ├── utils/               ← AppError.js, logger.js, tokenGenerator.js, urlNormalizer.js
│   ├── workers/             ← index.js (separate process entry point)
│   ├── app.js               ← Express app setup
│   └── server.js            ← HTTP server entry point
│
├── client/                  ← React 18 + Vite frontend
│   └── src/
│       ├── components/      ← Shared UI components
│       ├── hooks/           ← Custom React hooks
│       ├── pages/           ← Route-level pages
│       ├── schemas/         ← Zod schemas (copy from server/schemas/)
│       ├── services/        ← Axios API call functions
│       ├── stores/          ← Zustand stores
│       └── utils/           ← Helpers, formatters
│
├── docker/
│   ├── docker-compose.dev.yml   ← MongoDB + Redis for local dev
│   └── zap/zap-baseline.yaml    ← ZAP config (Phase 8)
│
└── docs/                    ← All 18 reference files (read-only, do not modify)
    ├── 01_PLATFORM_OVERVIEW.md
    ├── 02_TECH_STACK.md
    ├── 03_ARCHITECTURE.md
    ├── 04_DATABASE_SCHEMA.md
    ├── 05_API_REFERENCE.md
    ├── 06_SCANNER_INTEGRATION.md
    ├── 07_BUILD_ORDER.md
    ├── 08_ENV_AND_SECRETS.md
    ├── 09_SECURITY_RULES.md
    ├── 10_COMMON_PATTERNS.md
    ├── 11_FRONTEND_UI_GUIDE.md
    ├── 12_DEPLOYMENT.md
    ├── 13_TESTING.md
    ├── 14_PROMPT_SHEET.md
    ├── 15_AI_PROMPTS.md
    ├── 16_DATA_FLOWS.md
    ├── 17_TROUBLESHOOTING.md
    └── 18_GLOSSARY.md
```

---

## Non-Negotiable Rules — Enforce in Every File

1. **ESM only.** `import`/`export` everywhere. `"type": "module"` in package.json. No `require()`.
2. **async/await only.** No `.then()` chains.
3. **Every controller: try/catch → next(err).** No unhandled promise rejections.
4. **Zod validation on every request body and query param.** ZodError → 400 via central handler.
5. **Ownership check on every resource.** `Model.findOne({ _id, userId: req.user._id })`. Return 404 for both not-found AND not-yours.
6. **Domain verification before any deep/active scan.** Check in controller, not just frontend.
7. **All scans async via BullMQ.** No scan endpoint blocks. Always return `{ scanId, status: "queued" }`.
8. **Scanner output MUST go through `normalizer.js`** before touching DB or AI.
9. **Score is deterministic.** Calculated by `scoreEngine.js`, never AI.
10. **Rate limiting on everything.** Auth: 5/15min. API: 100/min. Scans: 3/day free.
11. **JWT access: 15min, refresh: 7 days in httpOnly cookie only.** Never localStorage.
12. **Never log: password, token, secret, key, authorization, cookie.**
13. **Scanner subprocesses: `execFile(binary, [argsArray])` ONLY.** Never `exec('cmd ' + userInput)`.
14. **Soft delete only.** `isDeleted: true`. Never hard delete user data.
15. **AI output labelled "AI-Assisted Guidance".** Never presented as confirmed fact.

---

## Standard Response Format

```js
// Success
res.status(200).json({ success: true, data: { ... } });
res.status(201).json({ success: true, data: { ... } });

// Error (handled by central errorHandler.js)
{ success: false, error: "Human message", code: "MACHINE_CODE" }
```

---

## Standard Controller Pattern

```js
export const myController = async (req, res, next) => {
  try {
    const parsed = myZodSchema.parse(req.body); // Throws ZodError → 400
    const resource = await Model.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resource) throw new AppError('Not found', 404, 'NOT_FOUND');
    // ... logic
    res.status(200).json({ success: true, data: { resource } });
  } catch (err) {
    next(err);
  }
};
```

---

## Key Reference Files

Before writing any code, check these:

| What you need | File |
|---|---|
| Feature spec / what to build | `docs/01_PLATFORM_OVERVIEW.md` |
| DB schemas and indexes | `docs/04_DATABASE_SCHEMA.md` |
| API endpoints (request/response shape) | `docs/05_API_REFERENCE.md` |
| Scanner tool integration details | `docs/06_SCANNER_INTEGRATION.md` |
| Environment variables | `docs/08_ENV_AND_SECRETS.md` |
| Security rules | `docs/09_SECURITY_RULES.md` |
| Code patterns (copy these) | `docs/10_COMMON_PATTERNS.md` |
| Frontend UI specs | `docs/11_FRONTEND_UI_GUIDE.md` |
| Current build phase checklist | `docs/07_BUILD_ORDER.md` |
| AI prompt templates | `docs/15_AI_PROMPTS.md` |

---

## Current Phase

Check `PHASES.md` to see what is done and what to build next.

---

## Tech Versions (exact)

| Package | Version |
|---|---|
| Node.js | 20 LTS |
| Express | 4.x |
| Mongoose | 8.x |
| MongoDB | 7.x |
| BullMQ | 5.x |
| ioredis | 5.x |
| Socket.io | 4.x |
| Zod | 3.x |
| jsonwebtoken | 9.x |
| bcryptjs | 2.x |
| Stripe SDK | latest |
| Puppeteer | 22.x |
| Cloudinary SDK | 2.x |
| Winston | 3.x |
| React | 18.x |
| Vite | 5.x |
| Tailwind CSS | 3.x |
| TanStack Query | 5.x |
| Zustand | 4.x |
| React Router | 6.x |
| Axios | 1.x |
| Socket.io-client | 4.x |
| Recharts | 2.x |
| React Hook Form | 7.x |
