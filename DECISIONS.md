# DECISIONS.md — Architecture Decision Log

> Claude Code: Read this before proposing changes to core architecture.
> If a decision here conflicts with something you want to do, ask first.

---

## D-01: ESM only (no CommonJS)

`"type": "module"` in package.json. All files use `import`/`export`.  
Cannot use `__dirname` → use `fileURLToPath(import.meta.url)` instead.  
Cannot use `require()` → always `import`.

---

## D-02: All scans are async via BullMQ (never synchronous)

Scan endpoints always return `{ scanId, status: "queued" }` immediately.  
Results come via Socket.io events: `scan:progress`, `scan:complete`, `scan:failed`.  
Rationale: scans take 30–120 seconds. Synchronous would timeout HTTP and block event loop.

---

## D-03: Worker emits events via internal HTTP (not Redis pub/sub)

Worker calls POST `/internal/emit` on the API server with `x-internal-api-key` header.  
API server receives it and calls `socket.io.to(user:userId).emit(...)`.  
Simpler than Redis pub/sub for MVP. Switch to Redis pub/sub in Phase 2 for multi-server.

---

## D-04: Two-token JWT (access in memory, refresh in httpOnly cookie)

Access token (15 min) → stored in Zustand memory only (never localStorage).  
Refresh token (7 days) → stored in httpOnly + Secure + SameSite=Strict cookie only.  
Cookie path is `/api/auth/refresh` so it's only sent to the refresh endpoint.

---

## D-05: normalizer.js is the single entry point for all scanner data

Raw output from Observatory, SSLyze, ZAP, Nuclei, testssl MUST pass through `normalizer.js`.  
No raw tool output ever touches the DB or AI prompts.  
Unified Finding shape is defined in `normalizer.js` — all other code depends only on that shape.

---

## D-06: Score is deterministic, never AI

`scoreEngine.js` calculates score from findings. Same findings = same score always.  
Deductions: Critical -20, High -10, Medium -5, Low -2, Info -0. Floor: 0.  
AI is only used for explanations and roadmaps, never scoring.

---

## D-07: Domain verification is enforced in the controller, not just the frontend

`scanController.createScan` throws 403 if `type === 'deep'` and `website.verified !== true`.  
Frontend check is UX-only. Server check is security enforcement.

---

## D-08: Soft delete only

`isDeleted: true` + `deletedAt: Date`. Never hard delete user data.  
Every `find` query must filter `{ isDeleted: false }`.  
Hard delete scheduled for 90 days after soft delete (Phase 2 cron job).

---

## D-09: Scanner subprocesses use execFile with array args

```js
// CORRECT — no shell injection possible
execFile('/usr/local/bin/nuclei', ['-u', url, '-json'])

// NEVER DO THIS — shell injection vulnerability
exec('nuclei -u ' + url)
```

---

## D-10: Stripe webhooks are the only source of truth for subscription status

Never update `user.subscription` from checkout success redirect.  
Only update from verified Stripe webhook events (signature check required).  
This prevents users from gaining premium access without paying.

---

## D-11: Cloudinary for all file storage (no local filesystem)

PDFs and avatars go to Cloudinary. Nothing is stored on the server disk.  
PDF flow: Puppeteer → buffer in memory → upload to Cloudinary → store URL in DB.

---

## D-12: AI prompt caching for cost control

System prompts use `cache_control: { type: "ephemeral" }` in Claude API calls.  
Chat history limited to last 10 messages passed to API.  
Roadmaps and executive summaries stored in DB — never regenerated unnecessarily.

---

## D-13: Free tier limits enforced server-side in controllers

`checkSubscription` middleware attaches `req.tier` ('free' or 'premium').  
Controllers check `req.tier` for all business limits.  
Frontend limit checks are UX-only. Backend is the enforcement layer.

---

## Future Decisions Needed

- [ ] Switch internal emit to Redis pub/sub when scaling to multiple API server instances
- [ ] Team/org account data model (Phase 2)
- [ ] Scheduled scan architecture (Phase 2 — node-cron vs separate cron service)
