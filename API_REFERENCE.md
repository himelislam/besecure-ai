# API Reference

This document is generated directly from the current `server/` implementation
(routes, controllers, Zod schemas, middleware) — not from `docs/05_API_REFERENCE.md`,
which was written as a spec before several endpoints were built and has since
drifted from the real behavior in a number of places (route shapes, request
bodies, response fields). Where the two disagree, **this document reflects what
the code actually does**; notable differences are called out inline.

**Base URL (development):** `http://localhost:5000`
All paths below are relative to this base, e.g. `POST /api/auth/register` →
`http://localhost:5000/api/auth/register`.

**Response envelope.** Every response follows one of:
```json
{ "success": true, "data": { /* ... */ } }
{ "success": true, "message": "Human-readable message" }
{ "success": false, "error": "Human-readable message", "code": "MACHINE_CODE" }
```
A handful of endpoints return `data` fields alongside a top-level `message`, or
vice versa — the exact shape for each endpoint is documented below.

**Standard error codes** (from `server/utils/AppError.js`'s `ErrorCodes` registry,
used via the central error handler in `server/middleware/errorHandler.js`):

| Code | Typical status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod (or Mongoose) validation failed |
| `INVALID_ID` | 400 | A route/query param isn't a valid MongoDB ObjectId (Mongoose `CastError`) |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired access token, missing refresh cookie, or wrong credentials |
| `INVALID_TOKEN` | 400 or 401 | A JWT (email verification, password reset, or malformed access/refresh token) failed to verify |
| `TOKEN_EXPIRED` | 401 | A JWT verified but is expired (raised by the raw `jsonwebtoken` error path, distinct from the manual `INVALID_TOKEN` checks used for email/reset tokens) |
| `FORBIDDEN` | 403 | Authenticated but not allowed (unverified email, wrong internal API key) |
| `NOT_FOUND` | 404 | Resource doesn't exist, or exists but isn't owned by the caller — deliberately the same response either way |
| `DUPLICATE_KEY` | 409 | Unique constraint violation (duplicate email, duplicate domain, Mongo `E11000`) |
| `DOMAIN_NOT_VERIFIED` | 403 | Deep scan requested on an unverified website |
| `PLAN_LIMIT_REACHED` | 403 | Free-tier plan limit hit (websites, deep scans, reports) |
| `RATE_LIMITED` | 429 | Either an `express-rate-limit` limiter or an application-level daily quota (scans, AI messages) was exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error; message is generic in production |

Two additional codes appear in practice but are not in the `ErrorCodes` registry
object (they're just string literals passed to `AppError`): `INVALID_INPUT`
(illegal vulnerability status transition) and the `INVALID_ID` above. Functionally
they behave the same as any other code — the registry is documentation, not an
enforced allow-list.

---

## Endpoint Summary

| Method | Path | Auth | Tier |
|---|---|---|---|
| GET | `/api/health` | None | N/A |
| POST | `/api/auth/register` | None | N/A |
| POST | `/api/auth/login` | None | N/A |
| GET | `/api/auth/verify-email` | None | N/A |
| POST | `/api/auth/forgot-password` | None | N/A |
| POST | `/api/auth/reset-password` | None | N/A |
| POST | `/api/auth/refresh` | Refresh cookie | N/A |
| GET | `/api/auth/me` | Bearer token | Both |
| PATCH | `/api/auth/me` | Bearer token | Both |
| POST | `/api/auth/change-password` | Bearer token | Both |
| POST | `/api/auth/logout` | Bearer token | Both |
| GET | `/api/websites` | Bearer token | Both |
| POST | `/api/websites` | Bearer token | Both (limit differs) |
| GET | `/api/websites/:id` | Bearer token | Both |
| PATCH | `/api/websites/:id` | Bearer token | Both |
| DELETE | `/api/websites/:id` | Bearer token | Both |
| GET | `/api/websites/:id/verify` | Bearer token | Both |
| POST | `/api/websites/:id/verify` | Bearer token | Both |
| POST | `/api/scans` | Bearer token | Both (deep = Premium only) |
| GET | `/api/scans/:id` | Bearer token | Both |
| GET | `/api/scans/:id/findings` | Bearer token | Both |
| GET | `/api/websites/:websiteId/scans` | Bearer token | Both |
| GET | `/api/vulnerabilities/stats` | Bearer token | Both |
| GET | `/api/vulnerabilities` | Bearer token | Both |
| GET | `/api/vulnerabilities/:id` | Bearer token | Both |
| PATCH | `/api/vulnerabilities/:id` | Bearer token | Both |
| GET | `/api/dashboard/summary` | Bearer token | Both |
| POST | `/api/chat/message` | Bearer token | Both (quota differs) |
| GET | `/api/chat/history` | Bearer token | Both |
| DELETE | `/api/chat/history` | Bearer token | Both |
| POST | `/api/roadmaps/:scanId` | Bearer token | Both |
| GET | `/api/roadmaps/:scanId` | Bearer token | Both |
| PATCH | `/api/roadmaps/:roadmapId/steps/:stepId` | Bearer token | Both |
| POST | `/api/reports/:scanId` | Bearer token | Both (limit differs) |
| GET | `/api/reports/:id` | Bearer token | Both |
| GET | `/api/reports` | Bearer token | Both |
| POST | `/api/billing/create-checkout` | Bearer token | Both |
| POST | `/api/billing/create-portal` | Bearer token | Both |
| GET | `/api/billing/subscription` | Bearer token | Both |
| POST | `/webhooks/stripe` | Stripe signature | N/A |
| POST | `/internal/emit` | Internal API key | N/A |

All `/api/*` routes additionally pass through the global `apiLimiter` regardless
of what's listed under "Rate limit" per endpoint below — see
[Rate Limiting](#rate-limiting) at the bottom for how the limiters stack.

---

## Health — `/api/health`

---

### GET /api/health

**Description:** Reports whether the API process, MongoDB, and Redis are all reachable.

**Authentication:** None
**Tier:** N/A
**Rate limit:** apiLimiter — 100 requests/minute (per IP, since there's no authenticated user on this route)

**Request:** No headers, params, query, or body.

**Success response — 200** (all services up):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "services": { "mongodb": "ok", "redis": "ok" }
  }
}
```

**Degraded response — 503** (one or more services down):
```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "services": { "mongodb": "ok", "redis": "down" }
  }
}
```

**Error responses:** None beyond the 503 degraded case above — this route never throws.

**Notes:**
- Intended target for uptime monitors (see `docs/12_DEPLOYMENT.md`).
- Redis is pinged live on every request (`PING` → `PONG`); Mongo is checked via `mongoose.connection.readyState`, not a live round-trip.

---

## Auth — `/api/auth`

---

### POST /api/auth/register

**Description:** Register a new user account and send a verification email.

**Authentication:** None
**Tier:** N/A
**Rate limit:** authLimiter — 5 requests/15 minutes per IP (stacked with the global apiLimiter)

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| name | string | yes | trimmed, min 1, max 100 chars |
| email | string | yes | valid email, lowercased and trimmed |
| password | string | yes | min 8, max 128 chars |

**Success response — 201:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid `name`, `email`, or `password` |
| 409 | DUPLICATE_KEY | Email already registered | Email already exists in `users` |
| 429 | RATE_LIMITED | Too many attempts. Try again in 15 minutes. | authLimiter tripped |
| 500 | INTERNAL_ERROR | Something went wrong | Unexpected server error |

**Notes:**
- Does **not** return a token — the account cannot log in until the email is verified.
- A Stripe customer is created asynchronously and non-blocking (`.catch()`'d and logged on failure) — registration succeeds even if Stripe is unreachable.
- The verification email send is likewise fire-and-forget — registration succeeds even if email delivery fails.
- New users default to `subscription.status: 'trialing'` with `trialEnd = now + TRIAL_DAYS` (14 days by default) — `User.isPremium()` treats this as premium-tier for the trial window, so a brand-new unverified/just-verified account is billed as Premium (not Free) until the trial lapses or is canceled.
- The verification token is a JWT signed with `JWT_EMAIL_SECRET`, 24h expiry, and is single-use (cleared from the user document on successful verification).

---

### POST /api/auth/login

**Description:** Authenticate with email + password; issues an access token and sets a refresh-token cookie.

**Authentication:** None
**Tier:** N/A
**Rate limit:** authLimiter — 5 requests/15 minutes per IP (stacked with apiLimiter)

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | yes | valid email, lowercased and trimmed |
| password | string | yes | min 1 char (no length re-validation at login — hashing comparison rejects wrong values regardless) |

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "email": "user@example.com",
      "name": "Jane Doe",
      "avatar": null,
      "emailVerified": true,
      "role": "user",
      "subscription": { "status": "trialing", "plan": "free", "currentPeriodEnd": null, "trialEnd": "2026-07-25T00:00:00.000Z" },
      "aiMessagesUsedToday": 0,
      "aiMessagesResetAt": "2026-07-11T00:00:00.000Z",
      "lastLoginAt": "2026-07-11T09:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
**Side effect:** Sets an httpOnly `refreshToken` cookie (see [Authentication Flow](#authentication-flow)).

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid `email` or `password` |
| 401 | UNAUTHORIZED | Invalid credentials | Wrong password, nonexistent email, **or** unverified email — deliberately identical for all three so a caller can't enumerate which case they hit |
| 429 | RATE_LIMITED | Too many attempts. Try again in 15 minutes. | authLimiter tripped |
| 500 | INTERNAL_ERROR | Something went wrong | Unexpected server error |

**Notes:**
- `user` in the response is the Mongoose `toJSON()`-transformed document — `password`, `emailVerificationToken`, `passwordResetToken`, `passwordResetExpires`, `tokenVersion`, `subscription.stripeCustomerId`, and `subscription.stripeSubscriptionId` are always stripped, never present.
- Updates `user.lastLoginAt` on every successful login.

---

### GET /api/auth/verify-email

**Description:** Verify a user's email address using the token from the verification email.

**Authentication:** None
**Tier:** N/A
**Rate limit:** apiLimiter only (no route-specific limiter)

**Request query params:**
| Param | Type | Required | Validation |
|---|---|---|---|
| token | string | yes | min 1 char |

**Success response — 200:**
```json
{ "success": true, "message": "Email verified" }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing `token` query param |
| 400 | INVALID_TOKEN | Invalid or expired verification link | JWT fails to verify, **or** no user matches both the decoded `userId` and the stored `emailVerificationToken` (already used / superseded) |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- One-time use: `emailVerificationToken` is set to `null` on the user document immediately after a successful verification, so replaying the same link fails with `INVALID_TOKEN` on the second attempt.

---

### POST /api/auth/forgot-password

**Description:** Request a password reset email.

**Authentication:** None
**Tier:** N/A
**Rate limit:** authLimiter — 5 requests/15 minutes per IP (stacked with apiLimiter)

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | yes | valid email, lowercased and trimmed |

**Success response — 200 (always, regardless of whether the email exists):**
```json
{ "success": true, "message": "Reset link sent if email exists" }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid `email` |
| 429 | RATE_LIMITED | Too many attempts. Try again in 15 minutes. | authLimiter tripped |

**Notes:**
- Deliberately does not reveal whether the email is registered — same 200 response either way.
- Reset token: JWT signed with `JWT_EMAIL_SECRET`, 24h expiry (`RESET_TOKEN_MAX_AGE`), stored on the user document (`passwordResetToken`, `passwordResetExpires`) so it can be invalidated/single-use-checked independently of the JWT's own expiry.
- Email send is fire-and-forget (`.catch()`'d and logged) — the endpoint still returns 200 if delivery fails.

---

### POST /api/auth/reset-password

**Description:** Complete a password reset using the token from the reset email.

**Authentication:** None
**Tier:** N/A
**Rate limit:** strictLimiter — 3 requests/hour, keyed by user-or-IP (stacked with apiLimiter)

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| token | string | yes | min 1 char |
| newPassword | string | yes | min 8, max 128 chars |

**Success response — 200:**
```json
{ "success": true, "message": "Password updated" }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid `token` or `newPassword` |
| 400 | INVALID_TOKEN | Invalid or expired reset link | JWT fails to verify, or no user matches the token with a non-expired `passwordResetExpires` |
| 429 | RATE_LIMITED | Too many requests. Try again in 1 hour. | strictLimiter tripped |

**Notes:**
- One-time use: `passwordResetToken`/`passwordResetExpires` are cleared on success.
- Bumps `user.tokenVersion` by 1, which invalidates every refresh token issued before the reset (all other sessions are force-logged-out).

---

### POST /api/auth/refresh

**Description:** Exchange the httpOnly refresh cookie for a new short-lived access token.

**Authentication:** None (reads the `refreshToken` httpOnly cookie instead of an `Authorization` header)
**Tier:** N/A
**Rate limit:** apiLimiter only (no route-specific limiter — this is the one auth endpoint not gated by authLimiter/strictLimiter, since the frontend is expected to call it silently and often)

**Request:** No body. Requires the `refreshToken` cookie (automatically sent by the browser; scoped to `path=/api/auth/refresh`).

**Success response — 200:**
```json
{ "success": true, "data": { "accessToken": "eyJhbGciOi..." } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 401 | UNAUTHORIZED | Refresh token missing | No `refreshToken` cookie present |
| 401 | UNAUTHORIZED | Invalid or expired refresh token | JWT fails to verify, **or** the user no longer exists, **or** `tokenVersion` in the token doesn't match the user's current `tokenVersion` (i.e. it was invalidated by a password change/reset or logout-everywhere event) |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Does not rotate the refresh token — the same refresh cookie remains valid until its own 7-day expiry or until `tokenVersion` is bumped elsewhere.

---

### GET /api/auth/me

**Description:** Return the currently authenticated user's profile.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No params, query, or body.

**Success response — 200:**
```json
{ "success": true, "data": { "user": { "_id": "...", "email": "...", "name": "...", "...": "same shape as login's user object" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 401 | UNAUTHORIZED | Authentication required | Missing/malformed `Authorization` header |
| 401 | UNAUTHORIZED | Invalid or expired token | Access token fails JWT verification |
| 401 | UNAUTHORIZED | User not found | Token is valid but the user was deleted since it was issued |
| 403 | FORBIDDEN | Email verification required | `user.emailVerified` is false (practically unreachable here since login itself requires a verified email, but the check is enforced uniformly by the shared `protect` middleware on every protected route) |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- The 401/403 rows above from `authenticateToken`/`checkSubscription` (the `protect` middleware) apply identically to **every** other Bearer-token-protected endpoint in this document; they are not repeated in full for each one below — only endpoint-specific error cases are listed further down.

---

### PATCH /api/auth/me

**Description:** Update the current user's display name and/or avatar URL.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request body** (`.strict()` — unknown keys are rejected):
| Field | Type | Required | Validation |
|---|---|---|---|
| name | string | no | trimmed, min 1, max 100 chars |
| avatar | string | no | must be a valid URL |

**Success response — 200:**
```json
{ "success": true, "data": { "user": { "...": "updated user object" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Invalid `name`/`avatar`, or an unrecognized field present (`.strict()`) |
| 404 | NOT_FOUND | User not found | User was deleted since the access token was issued |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Cannot change `email` or `password` here — email has no dedicated change endpoint at all; password changes go through `POST /api/auth/change-password`.
- `avatar` is expected to already be a Cloudinary URL (client uploads directly to Cloudinary first, per `docs/09_SECURITY_RULES.md`'s file-upload rule — this endpoint never receives a file).

---

### POST /api/auth/change-password

**Description:** Change the current user's password, invalidating all other sessions.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| currentPassword | string | yes | min 1 char |
| newPassword | string | yes | min 8, max 128 chars |

**Success response — 200:**
```json
{ "success": true, "message": "Password changed" }
```
**Side effect:** Clears the caller's own `refreshToken` cookie.

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid fields |
| 401 | UNAUTHORIZED | Current password is incorrect | `currentPassword` doesn't match |
| 404 | NOT_FOUND | User not found | User deleted since token issuance |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Bumps `tokenVersion`, invalidating every refresh token issued before this change — all other logged-in sessions/devices are force-logged-out on their next refresh attempt.

---

### POST /api/auth/logout

**Description:** Clear the refresh-token cookie server-side.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No body.

**Success response — 200:**
```json
{ "success": true, "message": "Logged out" }
```
**Side effect:** Clears the `refreshToken` cookie (scoped to `path=/api/auth/refresh`).

**Error responses:** Only the shared `protect`-middleware errors listed under `GET /api/auth/me`, plus 429 RATE_LIMITED.

**Notes:**
- Does **not** bump `tokenVersion` — it only clears this browser's cookie. A refresh token copied elsewhere (e.g. via XSS, which httpOnly is meant to prevent) would still be valid until its own expiry. Use `change-password`/`reset-password` for a hard invalidate-everywhere.

---

## Websites — `/api/websites`

All routes in this group require `protect` (Bearer token). Errors from that
middleware (401 `UNAUTHORIZED`, 403 `FORBIDDEN`) are omitted below except where
noted — see `GET /api/auth/me` above for the full list.

---

### GET /api/websites

**Description:** List the current user's websites (paginated).

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request query params:**
| Param | Type | Required | Validation |
|---|---|---|---|
| page | number | no | parsed manually (not Zod), defaults to 1, floored at 1 |
| limit | number | no | parsed manually (not Zod), defaults to 20, clamped to [1, 50] |

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "websites": [ { "_id": "...", "url": "https://example.com", "domain": "example.com", "nickname": "Main site", "verified": false, "lastScore": null, "lastGrade": null, "lastScanAt": null, "createdAt": "..." } ],
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

**Error responses:** 429 RATE_LIMITED only (beyond shared `protect` errors).

**Notes:**
- Only returns non-deleted websites (`isDeleted: false`); soft-deleted websites are invisible here.
- `page`/`limit` aren't Zod-validated — non-numeric input silently falls back to the defaults via `parseInt(...) || default`.

---

### POST /api/websites

**Description:** Register a new website to be scanned.

**Authentication:** Bearer token required
**Tier:** Both — free tier capped at `MAX_WEBSITES_FREE` (default 3), premium unlimited
**Rate limit:** apiLimiter only

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| url | string | yes | must be a valid URL, max 500 chars; normalized to `https://<lowercased hostname>` (path/query/protocol stripped) |
| nickname | string | yes | trimmed, min 1, max 100 chars |

**Success response — 201:**
```json
{
  "success": true,
  "data": {
    "website": { "_id": "...", "url": "https://example.com", "domain": "example.com", "nickname": "Main site", "verified": false, "verificationToken": "a1b2c3...", "createdAt": "..." },
    "verificationInstructions": {
      "token": "a1b2c3...",
      "dns": { "type": "TXT", "host": "_security-audit-verify.example.com", "value": "a1b2c3..." },
      "metaTag": { "tag": "<meta name=\"security-audit-verify\" content=\"a1b2c3...\">", "placement": "Add inside the <head> element of your homepage" }
    }
  }
}
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Invalid `url`/`nickname` |
| 403 | PLAN_LIMIT_REACHED | Website limit reached for your plan | Free-tier user already has `MAX_WEBSITES_FREE` non-deleted websites |
| 409 | DUPLICATE_KEY | This domain has already been added | Same normalized domain already exists for this user |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Duplicate-domain check is scoped per-user, not global — two different users can each add `example.com`.
- `verificationInstructions` is also independently retrievable later via `GET /api/websites/:id/verify`.

---

### GET /api/websites/:id

**Description:** Fetch a single website owned by the current user.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Website ObjectId.

**Success response — 200:**
```json
{ "success": true, "data": { "website": { "...": "full website document" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | Website not found | Doesn't exist, belongs to another user, or is soft-deleted — identical response for all three |
| 400 | INVALID_ID | Invalid _id: <value> | `id` isn't a syntactically valid ObjectId |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

---

### PATCH /api/websites/:id

**Description:** Rename a website's nickname.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Website ObjectId.

**Request body** (`.strict()`):
| Field | Type | Required | Validation |
|---|---|---|---|
| nickname | string | no | trimmed, min 1, max 100 chars |

**Success response — 200:**
```json
{ "success": true, "data": { "website": { "...": "updated website document" } } }
```

**Error responses:** Same as `GET /api/websites/:id`, plus 400 `VALIDATION_ERROR` for invalid/unrecognized body fields.

**Notes:**
- Only `nickname` is editable — `url`/`domain` cannot be changed after creation; add a new website instead.

---

### DELETE /api/websites/:id

**Description:** Remove a website from the user's account.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Website ObjectId.

**Success response — 200:**
```json
{ "success": true, "message": "Website removed" }
```

**Error responses:** Same as `GET /api/websites/:id`.

**Notes:**
- Soft delete only (`isDeleted: true`, `deletedAt` set) — per CLAUDE.md rule, user data is never hard-deleted here. Associated scans/vulnerabilities/reports/roadmaps are **not** cascaded or hidden — they remain queryable by ID directly, though the website itself drops out of `GET /api/websites` and `GET /api/websites/:id`.

---

### GET /api/websites/:id/verify

**Description:** Fetch the DNS TXT / HTML meta-tag instructions needed to verify domain ownership.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Website ObjectId.

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3...",
    "dns": { "type": "TXT", "host": "_security-audit-verify.example.com", "value": "a1b2c3..." },
    "metaTag": { "tag": "<meta name=\"security-audit-verify\" content=\"a1b2c3...\">", "placement": "Add inside the <head> element of your homepage" }
  }
}
```
Note this is the same object shape returned nested under `verificationInstructions` in `POST /api/websites`'s response, but here it's the entire `data` payload.

**Error responses:** Same as `GET /api/websites/:id`.

---

### POST /api/websites/:id/verify

**Description:** Check whether the DNS TXT record or HTML meta tag now matches, and mark the website verified if so.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Website ObjectId.
**Request body:** None — both DNS and meta-tag checks are always run automatically; there's no way to request only one.

**Success response — 200 (verified):**
```json
{ "success": true, "data": { "verified": true, "message": "Domain verified via DNS TXT record" } }
```
**Success response — 200 (not verified):**
```json
{ "success": true, "data": { "verified": false, "message": "Verification failed — no matching DNS TXT record or meta tag was found" } }
```

**Error responses:** Same as `GET /api/websites/:id`.

**Notes:**
- Once verified, `website.verified` stays `true` even if the DNS/meta-tag proof is later removed — there's no un-verification path via this endpoint.
- `verificationAttempts` is incremented and `lastVerificationAttempt` updated on every call, success or failure.
- Domain verification is required before a **deep** scan can be started (see `POST /api/scans` below); it is not required for baseline scans.

---

## Scans — `/api/scans` (and one route under `/api/websites`)

---

### POST /api/scans

**Description:** Queue a new scan (baseline or deep) for one of the user's websites.

**Authentication:** Bearer token required
**Tier:** Both — `type: "deep"` requires Premium; baseline is available to both
**Rate limit:** apiLimiter, plus an application-level daily cap: `FREE_SCANS_PER_DAY` (default 3) per website per calendar day, free tier only; premium is unlimited

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| websiteId | string | yes | min 1 char |
| type | string | no | enum `"baseline"` \| `"deep"`, defaults to `"baseline"` |

**Success response — 201:**
```json
{ "success": true, "data": { "scanId": "665f...", "status": "queued" } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing `websiteId` or invalid `type` |
| 404 | NOT_FOUND | Website not found | `websiteId` doesn't belong to the caller or doesn't exist |
| 403 | DOMAIN_NOT_VERIFIED | Domain verification required before running deep scans | `type: "deep"` on an unverified website (checked before the tier check) |
| 403 | PLAN_LIMIT_REACHED | Deep scans require a premium subscription | `type: "deep"` requested by a free-tier user (on an already-verified domain) |
| 429 | RATE_LIMITED | Daily scan limit reached | Free-tier user already ran `FREE_SCANS_PER_DAY` scans on this website today |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- The daily scan cap is scoped **per website**, not globally per user — a user with 2 websites gets `FREE_SCANS_PER_DAY` scans on each independently (tracked in the `scanratelimits` collection, keyed by `{userId, websiteId, date}`).
- Response is intentionally minimal — the actual scan job runs asynchronously via BullMQ (worker process, concurrency 2); poll `GET /api/scans/:id` for status/results, or listen for the corresponding Socket.io event (emitted server-to-server via `POST /internal/emit`).
- `docs/05_API_REFERENCE.md` describes a `position` field in the response (queue position) — this is not implemented; the actual response is just `{ scanId, status }`.

---

### GET /api/scans/:id

**Description:** Fetch a scan's current status and results.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Scan ObjectId.

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "scan": {
      "_id": "...", "websiteId": "...", "userId": "...", "type": "baseline",
      "targetUrl": "https://example.com",
      "status": "completed",
      "progress": 100, "progressMessage": null,
      "score": 82, "grade": "B",
      "findingCounts": { "critical": 0, "high": 1, "medium": 2, "low": 3, "info": 1 },
      "toolsRun": [ { "name": "observatory", "status": "success", "durationMs": 1200, "error": null } ],
      "startedAt": "...", "completedAt": "...", "durationMs": 15234,
      "error": null,
      "createdAt": "...", "updatedAt": "..."
    }
  }
}
```

**Error responses:** 404 `NOT_FOUND` ("Scan not found") if it doesn't exist or isn't owned by the caller; 400 `INVALID_ID` for a malformed `id`; 429 `RATE_LIMITED`.

**Notes:**
- `status` is one of `queued`, `running`, `completed`, `failed` (**not** `complete` — `docs/05` and `docs/04` both use `complete`, the actual schema enum is `completed`).
- Raw per-tool output (`rawResults` equivalent — actually stored on the scan document internally as tool output, not exposed here) is never included in this response; only the normalized `findingCounts`/`score`/`grade`/`toolsRun` summary is client-facing.
- Detailed findings are fetched separately via `GET /api/scans/:id/findings`.

---

### GET /api/scans/:id/findings

**Description:** List the vulnerabilities discovered by (or re-confirmed in) a specific scan.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Scan ObjectId.
**Request query params:**
| Param | Type | Required | Validation |
|---|---|---|---|
| page | number | no | parsed manually, defaults to 1 |
| limit | number | no | parsed manually, defaults to 20, clamped to [1, 50] |

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "vulnerabilities": [ { "_id": "...", "title": "Missing Content-Security-Policy Header", "severity": "medium", "owaspCategory": "A05", "status": "open", "...": "..." } ],
    "total": 6, "page": 1, "pages": 1
  }
}
```

**Error responses:** 404 `NOT_FOUND` ("Scan not found"); 400 `INVALID_ID`; 429 `RATE_LIMITED`.

**Notes:**
- A vulnerability "belongs" to a scan if it was either first detected there (`scanId`) **or** re-confirmed there on a later re-scan (`lastCheckedScanId`) — the query matches either field, so a finding from an earlier scan that's still present will also show up under a later scan's findings.
- Sorted by `severity` ascending then `createdAt` descending. Because `severity` is a plain string field, Mongo sorts it lexically, not by actual risk order — ascending alphabetical order happens to put `critical` and `high` first (as expected), but then continues `info`, `low`, `medium`, i.e. `info` sorts *before* `low` and `medium` even though it's the least severe. Don't rely on this ordering as a true severity ranking in a client; sort client-side by an explicit severity-rank map if that matters.

---

### GET /api/websites/:websiteId/scans

**Description:** List scan history for one website.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Note on location:** this route is registered in `websiteRouter.js`, not `scanRouter.js` — its URL is under `/api/websites/`, not `/api/scans/`, even though the handler lives in `scanController.js`.

**Request URL params:** `websiteId` — Website ObjectId.
**Request query params:** `page`, `limit` — same as above (manual parsing, not Zod).

**Success response — 200:**
```json
{ "success": true, "data": { "scans": [ { "...": "scan summary" } ], "total": 12, "page": 1, "pages": 1 } }
```

**Error responses:** 404 `NOT_FOUND` ("Website not found") if the website doesn't exist or isn't owned by the caller; 400 `INVALID_ID`; 429 `RATE_LIMITED`.

**Notes:**
- Sorted newest first (`createdAt: -1`).
- `docs/05_API_REFERENCE.md` also documents a `DELETE /api/scans/:id` endpoint — **this does not exist** in the current codebase; there is no way to delete a scan via the API.

---

## Vulnerabilities — `/api/vulnerabilities`

---

### GET /api/vulnerabilities/stats

**Description:** Aggregate open-vulnerability counts by severity, status, and OWASP category.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Note on route order:** registered before `GET /:id` specifically so the literal path `/stats` isn't swallowed by the `:id` param route.

**Request query params:**
| Param | Type | Required | Validation |
|---|---|---|---|
| websiteId | string | no | **not Zod-validated** — passed directly to `new mongoose.Types.ObjectId(...)` if present |

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "bySeverity": { "critical": 1, "high": 3, "medium": 3, "low": 1 },
    "byStatus": { "open": 5, "in_progress": 2, "fixed": 1 },
    "byOwasp": { "A05": 4, "A03": 2, "A02": 2 }
  }
}
```
Only severities/statuses/categories with at least one matching vulnerability appear as keys — there is no zero-filling.

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 500 | INTERNAL_ERROR | (raw BSON error message, in development) | `websiteId` is present but not a syntactically valid ObjectId — this isn't caught as a Mongoose `CastError` (it throws before any query runs), so it falls through the error handler's default branch as a generic 500 rather than a clean 400. This is a real edge case in the current code, not a documentation simplification. |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Counts are scoped to `isDeleted: false` vulnerabilities only, but **not** filtered by `status: 'open'` — unlike the dashboard summary, this includes vulnerabilities in every status (that's the point of `byStatus`).

---

### GET /api/vulnerabilities

**Description:** List/filter the user's vulnerabilities across all websites.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request query params:**
| Param | Type | Required | Validation |
|---|---|---|---|
| websiteId | string | no | — |
| scanId | string | no | — |
| status | string | no | enum: `open`, `assigned`, `in_progress`, `fixed`, `verified`, `closed`, `false_positive` |
| severity | string | no | enum: `critical`, `high`, `medium`, `low`, `info` |
| owaspCategory | string | no | — |
| sortBy | string | no | enum: `severity`, `createdAt`, `status` (defaults to `createdAt`) |
| sortOrder | string | no | enum: `asc`, `desc` (defaults to `desc`) |
| page | number | no | coerced int, min 1, defaults to 1 |
| limit | number | no | coerced int, min 1, max 50, defaults to 20 |

**Success response — 200:**
```json
{ "success": true, "data": { "vulnerabilities": [ { "...": "..." } ], "total": 6, "page": 1, "pages": 1 } }
```

**Error responses:** 400 `VALIDATION_ERROR` for an invalid `status`/`severity`/`sortBy`/`sortOrder` value or non-numeric `page`/`limit`; 429 `RATE_LIMITED`.

**Notes:**
- Unlike the paginated list endpoints elsewhere in the API, this one's `page`/`limit` **are** Zod-validated (via `listVulnerabilitiesSchema`, using `z.coerce.number()`), so `?page=abc` returns a clean 400 here instead of silently falling back to a default the way it does on `GET /api/websites` or `GET /api/scans/:id/findings`.

---

### GET /api/vulnerabilities/:id

**Description:** Fetch a single vulnerability.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Vulnerability ObjectId.

**Success response — 200:**
```json
{ "success": true, "data": { "vulnerability": { "...": "full document, including notes[]" } } }
```

**Error responses:** 404 `NOT_FOUND` ("Vulnerability not found"); 400 `INVALID_ID`; 429 `RATE_LIMITED`.

---

### PATCH /api/vulnerabilities/:id

**Description:** Update a vulnerability's status/priority, or append a note.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Vulnerability ObjectId.

**Request body** (`.strict()`; at least one field required):
| Field | Type | Required | Validation |
|---|---|---|---|
| status | string | no* | enum: `open`, `assigned`, `in_progress`, `fixed`, `closed`, `false_positive` (**not** `verified` — see Notes) |
| priority | string | no* | enum: `critical`, `high`, `medium`, `low` |
| note | string | no* | trimmed, min 1, max 2000 chars |

\* At least one of `status`, `priority`, `note` must be present (enforced by a Zod `.refine()`).

**Success response — 200:**
```json
{ "success": true, "data": { "vulnerability": { "...": "updated document" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | At least one of status, priority, or note is required | Empty body, or all three fields omitted |
| 400 | VALIDATION_ERROR | field-specific message(s) | Invalid enum value or unrecognized field |
| 400 | INVALID_INPUT | `Cannot transition vulnerability from "<from>" to "<to>"` | Requested `status` isn't a legal transition from the current status (see the state machine below) |
| 404 | NOT_FOUND | Vulnerability not found | Doesn't exist / not owned |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- `status` isn't a free-for-all — legal transitions are enforced by `VALID_STATUS_TRANSITIONS` in `models/Vulnerability.js`:
  - `open` → `assigned`, `in_progress`, `false_positive`, `closed`
  - `assigned` → `open`, `in_progress`, `false_positive`, `closed`
  - `in_progress` → `assigned`, `fixed`, `false_positive`, `closed`
  - `fixed` → `open`
  - `verified` → `open`, `closed`
  - `closed` → `open`
  - `false_positive` → `open`
- `verified` cannot be set directly via this endpoint (it's excluded from the Zod enum entirely) — it's set automatically by the scan worker when a re-scan no longer detects a previously-`fixed` vulnerability.
- Setting `status: "fixed"` stamps `resolvedAt`.
- `note` doesn't replace anything — it's pushed onto the `notes[]` array along with `addedBy` (the caller) and `addedAt` (now).

---

## Dashboard — `/api/dashboard`

---

### GET /api/dashboard/summary

**Description:** Aggregated stats for the main dashboard view — totals, per-website scores, recent scans, risk breakdown, and score history.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No params, query, or body.

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "totalWebsites": 3,
    "totalScans": 47,
    "openVulnerabilities": 12,
    "averageScore": 73,
    "websitesSummary": [
      { "_id": "...", "nickname": "Main Site", "domain": "example.com", "lastScore": 87, "lastGrade": "A", "lastScanAt": "...", "openVulnCount": 2 }
    ],
    "recentScans": [ { "_id": "...", "websiteId": { "_id": "...", "nickname": "Main Site", "domain": "example.com" }, "score": 87, "grade": "A", "type": "baseline", "createdAt": "...", "completedAt": "..." } ],
    "riskDistribution": { "critical": 0, "high": 2, "medium": 5, "low": 4, "info": 1 },
    "scoreHistory": [ { "websiteId": "...", "nickname": "Main Site", "history": [ { "date": "...", "score": 87 } ] } ]
  }
}
```

**Error responses:** 429 `RATE_LIMITED` only, beyond shared `protect` errors.

**Notes:**
- `averageScore` is computed from each website's **latest completed** scan score, then averaged — not an average across all historical scans.
- `riskDistribution` and `openVulnerabilities` only count vulnerabilities with `status: 'open'` — `in_progress`/`assigned`/etc. are excluded.
- `recentScans` is capped at the 5 most recent completed scans across all of the user's websites; `websiteId` is populated with just `{ nickname, domain }` (not the full website document) to keep the payload small.
- `scoreHistory` includes up to the last 10 completed scans per website, oldest-first (for charting).
- All the parallel aggregations use `Promise.all` after first resolving the website list (which several of the parallel queries depend on) — see `docs/09_SECURITY_RULES.md`'s N+1/performance guidance; this endpoint was specifically audited for this in Phase 11.

---

## Chat — `/api/chat`

---

### POST /api/chat/message

**Description:** Send a message to the AI security assistant and receive a reply.

**Authentication:** Bearer token required
**Tier:** Both — daily message quota differs (`FREE_AI_MESSAGES_PER_DAY` default 20 vs `PREMIUM_AI_MESSAGES_PER_DAY` default 200)
**Rate limit:** apiLimiter, plus an application-level daily quota (DB-counted, not `express-rate-limit`)

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| content | string | yes | trimmed, min 1, max 2000 chars |
| scanId | string | no | attaches scan context to the AI call |

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "message": { "_id": "...", "userId": "...", "role": "assistant", "content": "Based on your scan...", "tier": "free", "createdAt": "..." },
    "aiAssisted": true,
    "inputTokens": 512,
    "outputTokens": 340
  }
}
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/too-long `content` |
| 429 | RATE_LIMITED | Daily AI message limit reached | User already sent their tier's daily quota of messages today |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |
| 500 | INTERNAL_ERROR | (varies) | The Claude API call itself fails/times out — not wrapped in a specific `AppError`, so it surfaces as a generic error |

**Notes:**
- `aiAssisted: true` is the machine-readable form of CLAUDE.md's rule that AI output must be labeled — never presented as unqualified fact.
- Both the user's message and the assistant's reply are persisted as separate `ChatMessage` documents (`role: 'user'` and `role: 'assistant'`); only the assistant message is returned in the response body — the user's own message isn't echoed back.
- Daily quota is counted from `ChatMessage` documents with `role: 'user'` created since local midnight (server time), not from a separate counter field.
- `docs/05_API_REFERENCE.md` describes a `sessionId`-based conversation model (`{ message, sessionId, attachedScanId }` request, session-scoped history) — **this was never implemented**. There is no `sessionId` concept anywhere in the actual code; `ChatMessage` has no `sessionId` field, and history is simply "the user's last 30 messages," full stop.

---

### GET /api/chat/history

**Description:** Fetch the user's recent chat history.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No query params are read by this endpoint (any provided are ignored — see Notes).

**Success response — 200:**
```json
{ "success": true, "data": { "messages": [ { "role": "user", "content": "...", "createdAt": "..." }, { "role": "assistant", "content": "...", "createdAt": "..." } ] } }
```

**Error responses:** 429 `RATE_LIMITED` only, beyond shared `protect` errors.

**Notes:**
- Always returns exactly the last 30 messages (hardcoded `limit(30)`), oldest-first. `docs/05_API_REFERENCE.md`'s `?sessionId=&limit=30` query params are not implemented — passing them has no effect.

---

### DELETE /api/chat/history

**Description:** Permanently delete all of the user's chat history.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No body.

**Success response — 200:**
```json
{ "success": true, "message": "Chat history cleared" }
```

**Error responses:** 429 `RATE_LIMITED` only, beyond shared `protect` errors.

**Notes:**
- **This is a hard delete** (`ChatMessage.deleteMany({ userId })`) — unlike every other user-owned resource in this API, chat messages are not soft-deleted. This is a deliberate exception in the current code, not an oversight in this document.

---

## Roadmaps — `/api/roadmaps`

---

### POST /api/roadmaps/:scanId

**Description:** Generate (or retrieve a cached) AI remediation roadmap for a scan's findings.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `scanId` — Scan ObjectId.
**Request body:** None.

**Success response — 200** (a completed roadmap for this scan already exists — returned as-is, not regenerated):
```json
{ "success": true, "data": { "roadmap": { "...": "existing completed roadmap" } } }
```
**Success response — 201** (newly generated):
```json
{
  "success": true,
  "data": {
    "roadmap": {
      "_id": "...", "scanId": "...", "websiteId": "...",
      "summary": "Your site scored a B (82)...",
      "estimatedStartScore": 82, "estimatedEndScore": 96,
      "steps": [ { "week": 1, "title": "Add a Content-Security-Policy header", "why": "...", "how": "...", "estimatedScoreGain": 5, "severity": "medium", "isDone": false, "completedAt": null } ],
      "status": "completed",
      "generatedAt": "...", "tokenUsage": { "inputTokens": 1024, "outputTokens": 812 }
    }
  }
}
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | Scan not found | `scanId` doesn't exist or isn't owned by the caller |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |
| 500 | INTERNAL_ERROR | (varies) | The Claude API call fails — the roadmap document is marked `status: 'failed'` with the error message saved, **and** the original error is re-thrown so the HTTP response itself also reports the failure (not just a silently-failed background job) |

**Notes:**
- If a prior generation attempt failed, calling this again reuses the same `Roadmap` document (resets it to `status: 'generating'`) rather than creating a duplicate — `scanId` has a unique index, one roadmap per scan.
- Unlike scans/reports, roadmap generation runs **synchronously** inside the request — there's no BullMQ job for this; the response only returns once the Claude API call completes (or fails).
- `docs/05_API_REFERENCE.md`'s `PATCH /api/roadmaps/:roadmapId/tasks/:taskId` with `{ completed }` body describes a different shape than what's implemented — see `PATCH /api/roadmaps/:roadmapId/steps/:stepId` below.

---

### GET /api/roadmaps/:scanId

**Description:** Fetch the roadmap generated for a scan.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `scanId` — Scan ObjectId.

**Success response — 200:**
```json
{ "success": true, "data": { "roadmap": { "...": "full roadmap document" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | Scan not found | `scanId` doesn't exist or isn't owned by the caller |
| 404 | NOT_FOUND | Roadmap not found | Scan exists but no roadmap has been generated for it yet — call `POST /api/roadmaps/:scanId` first |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

---

### PATCH /api/roadmaps/:roadmapId/steps/:stepId

**Description:** Toggle a single roadmap step's completion state.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `roadmapId` — Roadmap ObjectId. `stepId` — the step's Mongoose subdocument `_id` (found on each entry in `roadmap.steps[]`).
**Request body:** None — this is a **toggle**, not a set. There is no `completed`/`isDone` field to pass; calling this endpoint flips the step's current `isDone` value.

**Success response — 200:**
```json
{ "success": true, "data": { "roadmap": { "...": "updated roadmap, with the target step's isDone flipped" } } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | Roadmap not found | `roadmapId` doesn't exist or isn't owned by the caller |
| 404 | NOT_FOUND | Step not found | `stepId` doesn't match any subdocument in `roadmap.steps` |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Toggling to done sets `completedAt` to now; toggling back off sets it to `null`.
- This diverges from `docs/05_API_REFERENCE.md` in three ways: the path segment is `/steps/:stepId` (not `/tasks/:taskId`), there's no request body at all (not `{ completed: boolean }`), and the underlying field on the roadmap document is `steps[]` (not `weeks[].tasks[]`) — the roadmap model is flatter than the original spec described.

---

## Reports — `/api/reports`

---

### POST /api/reports/:scanId

**Description:** Generate a PDF report for a scan (or return the existing one if already generated).

**Authentication:** Bearer token required
**Tier:** Both — free tier limited to one non-failed report attempt per scan; premium unlimited
**Rate limit:** apiLimiter only

**Request URL params:** `scanId` — Scan ObjectId.
**Request body:** None.

**Success response — 200** (a completed report for this scan already exists — cached, not regenerated):
```json
{ "success": true, "data": { "reportId": "...", "status": "completed" } }
```
**Success response — 201** (new report job queued):
```json
{ "success": true, "data": { "reportId": "...", "status": "generating" } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | Scan not found | `scanId` doesn't exist or isn't owned by the caller |
| 403 | PLAN_LIMIT_REACHED | Report limit reached for your plan | Free-tier user already has a non-`failed` report (generating or completed) for this scan |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Generation is asynchronous via a BullMQ report job (Puppeteer renders the PDF, uploads to Cloudinary); poll `GET /api/reports/:id` for `status` to transition from `generating` → `completed`/`failed`, or listen for the Socket.io event.
- Report `status` values are `generating`, `completed`, `failed` (**not** `ready`, as `docs/05_API_REFERENCE.md` describes).
- There is no `downloadUrl` field returned from this endpoint — that only appears on the report document itself once fetched via `GET /api/reports/:id` (as `cloudinaryUrl`, once generation completes).
- `docs/05_API_REFERENCE.md` also documents a `GET /api/reports/scan/:scanId` lookup route — **this does not exist**; use `POST /api/reports/:scanId` (idempotent — it returns the existing report if one is already `completed`) instead.

---

### GET /api/reports/:id

**Description:** Fetch a single report's status and download link.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request URL params:** `id` — Report ObjectId.

**Success response — 200:**
```json
{
  "success": true,
  "data": {
    "report": {
      "_id": "...", "scanId": "...", "websiteId": "...",
      "status": "completed",
      "cloudinaryUrl": "https://res.cloudinary.com/.../report.pdf",
      "cloudinaryPublicId": "...", "fileSizeBytes": 245678,
      "generatedAt": "...", "tokenUsage": { "inputTokens": 640, "outputTokens": 210 },
      "createdAt": "...", "updatedAt": "..."
    }
  }
}
```

**Error responses:** 404 `NOT_FOUND` ("Report not found"); 400 `INVALID_ID`; 429 `RATE_LIMITED`.

**Notes:**
- Reports have no soft-delete flag (`isDeleted` doesn't exist on the `Report` model) and there is no `DELETE` endpoint for them at all.

---

### GET /api/reports

**Description:** List all of the user's reports (paginated).

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request query params:** `page`, `limit` — same manual parsing as the other list endpoints (not Zod-validated).

**Success response — 200:**
```json
{ "success": true, "data": { "reports": [ { "...": "..." } ], "total": 4, "page": 1, "pages": 1 } }
```

**Error responses:** 429 `RATE_LIMITED` only, beyond shared `protect` errors.

**Notes:**
- Sorted newest first (`createdAt: -1`), across all of the user's websites/scans (not filterable by website or scan in this endpoint).

---

## Billing — `/api/billing`

---

### POST /api/billing/create-checkout

**Description:** Start a Stripe Checkout session to upgrade to Premium.

**Authentication:** Bearer token required
**Tier:** Both (typically called by free/trialing users)
**Rate limit:** apiLimiter only

**Request:** No body.

**Success response — 200:**
```json
{ "success": true, "data": { "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..." } }
```

**Error responses:** 429 `RATE_LIMITED`; unhandled Stripe API errors surface as a generic 500 (not wrapped in a specific `AppError`), beyond shared `protect` errors.

**Notes:**
- If the user has no `subscription.stripeCustomerId` yet, one is created first (and persisted onto the user) before the Checkout session is created — this is the only place besides registration where a Stripe customer can be created.

---

### POST /api/billing/create-portal

**Description:** Start a Stripe Customer Portal session for the user to manage their existing subscription.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No body.

**Success response — 200:**
```json
{ "success": true, "data": { "portalUrl": "https://billing.stripe.com/p/session/..." } }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 404 | NOT_FOUND | No billing account found for this user | User has never checked out / has no `stripeCustomerId` yet |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

---

### GET /api/billing/subscription

**Description:** Fetch the user's current subscription status.

**Authentication:** Bearer token required
**Tier:** Both
**Rate limit:** apiLimiter only

**Request:** No params, query, or body.

**Success response — 200:**
```json
{ "success": true, "data": { "subscription": { "status": "trialing", "plan": "free", "trialEnd": "2026-07-25T00:00:00.000Z", "currentPeriodEnd": null } } }
```

**Error responses:** 429 `RATE_LIMITED` only, beyond shared `protect` errors.

**Notes:**
- Deliberately whitelisted response — `stripeCustomerId` and `stripeSubscriptionId` are never included here, even though the Mongoose `toJSON` transform on `User` would already strip them from a full user document; this endpoint constructs the response object manually as an extra safeguard.

---

## Webhooks — `/webhooks/stripe`

---

### POST /webhooks/stripe

**Description:** Receive and process Stripe subscription lifecycle events.

**Authentication:** None (JWT/session) — authenticated instead via Stripe's HMAC request signature (`Stripe-Signature` header, verified against `STRIPE_WEBHOOK_SECRET`)
**Tier:** N/A
**Rate limit:** apiLimiter (per-IP; mounted directly on this route since it's registered before `app.use('/api/', apiLimiter)` and thus wouldn't otherwise be covered by the global limiter). Signature verification is the real access control here — the rate limiter is only a request-flooding backstop.

**Request headers:** `Stripe-Signature` (required — set automatically by Stripe's webhook delivery, not something a client sets manually).
**Request body:** Raw Stripe event JSON (parsed via `express.raw()`, not `express.json()` — signature verification requires the exact raw bytes Stripe signed).

**Success response — 200 (always, for any recognized-or-not event, as long as the signature is valid):**
```json
{ "received": true }
```
Note this response does **not** follow the `{ success, data }` envelope used everywhere else in the API — Stripe only cares about the 200 status code, and this shape is a deliberate exception.

**Error responses:**
| Status | Body | When |
|---|---|---|
| 400 | `{ "success": false, "error": "Webhook signature verification failed: <details>" }` | Signature is missing, malformed, or doesn't match `STRIPE_WEBHOOK_SECRET` — this is the only failure mode; internal processing errors are caught and logged without ever surfacing as a non-200 response (see Notes) |
| 429 | `{ "success": false, "error": "Too many requests. Please slow down.", "code": "RATE_LIMITED" }` | apiLimiter tripped |

Note the 400 response above also doesn't include a `code` field, unlike the rest of the API's error responses — it's constructed manually in `webhookRouter.js` rather than passed through the central `errorHandler.js`.

**Handled event types:**
| Event | Effect |
|---|---|
| `customer.subscription.created` | Sets `subscription.stripeSubscriptionId`, `status`, `plan: 'premium'`, `currentPeriodEnd` |
| `customer.subscription.updated` | Syncs `subscription.status`, `currentPeriodEnd` |
| `customer.subscription.deleted` | Sets `subscription.status: 'canceled'`, `plan: 'free'` |
| `invoice.payment_failed` | Sets `subscription.status: 'past_due'` |

Any other event type is logged as unhandled but still acknowledged with `200 { received: true }` (Stripe requires a 2xx or it will retry indefinitely).

**Notes:**
- If processing a recognized event throws (e.g. a DB error), the error is caught, logged, and **swallowed** — the endpoint still returns `200 { received: true }`, since Stripe's retry-on-non-200 behavior wouldn't fix a bug in this codebase's own update logic anyway.
- `docs/05_API_REFERENCE.md` additionally lists `invoice.payment_succeeded → set to active` as a handled event — **this is not implemented**; that event type currently falls through to the "unhandled, logged, 200" default path and does not update `subscription.status` back to `active` after a past-due invoice is paid.
- Must be mounted before `express.json()` in `app.js` (it is) — once the global JSON parser consumes the body, the raw bytes needed for signature verification are gone.

---

## Internal — `/internal` (not exposed to end users)

---

### POST /internal/emit

**Description:** Server-to-server endpoint used by the BullMQ worker process to push a Socket.io event to a specific user's connected client(s), since the worker doesn't hold the Socket.io server instance itself (only the API process does).

**Authentication:** Internal API key — `x-internal-api-key` header must exactly match `INTERNAL_API_KEY`
**Tier:** N/A
**Rate limit:** apiLimiter (applied directly on this route, since `/internal` is mounted before `app.use('/api/', apiLimiter)` and would otherwise bypass the global limiter entirely)

**Request headers:**
| Header | Required | Value |
|---|---|---|
| x-internal-api-key | yes | Must equal `process.env.INTERNAL_API_KEY` |

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| userId | string | yes | min 1 char |
| event | string | yes | min 1 char (e.g. `"scan:progress"`, `"scan:completed"`, `"report:completed"`) |
| data | object | yes | any object shape (`z.record(z.any())`) — passed through as-is to the socket event payload |

**Success response — 200:**
```json
{ "success": true }
```

**Error responses:**
| Status | Code | Message | When |
|---|---|---|---|
| 400 | VALIDATION_ERROR | field-specific message(s) | Missing/invalid `userId`, `event`, or `data` |
| 403 | FORBIDDEN | Forbidden | Missing or incorrect `x-internal-api-key` header |
| 429 | RATE_LIMITED | Too many requests. Please slow down. | apiLimiter tripped |

**Notes:**
- Not reachable by regular API clients in any normal flow — it's called by `server/workers/index.js` (the separate worker process) using `API_INTERNAL_URL` + `INTERNAL_API_KEY` from the environment.
- `docs/05_API_REFERENCE.md` describes this endpoint's body as `{ room, event, data }` and also documents a second internal route, `GET /internal/report-template/:scanId`, for Puppeteer's PDF HTML template — **neither matches the current code**: the actual body field is `userId` (not `room`), and the report-template route doesn't exist at all (the PDF service renders its HTML template in-process rather than via an internal HTTP round-trip).

---

## Authentication Flow

1. **Register:** `POST /api/auth/register` → account created with `emailVerified: false`; a verification email is sent (fire-and-forget).
2. **Verify:** user clicks the emailed link → `GET /api/auth/verify-email?token=...` → `emailVerified` flips to `true`.
3. **Login:** `POST /api/auth/login` → returns `accessToken` in the JSON body, and sets an httpOnly `refreshToken` cookie:
   ```js
   {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
     path: '/api/auth/refresh',       // only ever sent back on the refresh call
   }
   ```
4. **Authenticated requests:** send `Authorization: Bearer <accessToken>` on every protected call. Access tokens are signed with `JWT_ACCESS_SECRET` and expire in 15 minutes (`JWT_ACCESS_EXPIRES_IN`). Per `docs/09_SECURITY_RULES.md`, the client is expected to hold this token in memory only (e.g. a Zustand store) — never `localStorage`/`sessionStorage`.
5. **Refresh:** when a request comes back `401 UNAUTHORIZED` (or proactively, shortly before the 15-minute expiry), call `POST /api/auth/refresh` — the browser automatically attaches the `refreshToken` cookie (scoped to `path=/api/auth/refresh`, so it's never sent on any other request); returns a new `accessToken`. The refresh token itself is **not** rotated on use.
6. **Logout:** `POST /api/auth/logout` clears the cookie for this browser only. It does not bump `tokenVersion`, so it doesn't invalidate the underlying refresh token itself — only this specific cookie is cleared.
7. **Global invalidation:** changing password (`POST /api/auth/change-password`) or completing a reset (`POST /api/auth/reset-password`) increments `user.tokenVersion`, which immediately invalidates every previously-issued refresh token (checked on every `POST /api/auth/refresh` call) — this is the "log out everywhere" mechanism; there's no dedicated endpoint for it beyond going through one of these two flows.

---

## Rate Limiting

Three `express-rate-limit` instances are defined in `server/middleware/rateLimiter.js`, plus two application-level (DB-tracked) daily quotas that are unrelated to `express-rate-limit`:

| Limiter | Window | Max | Keyed by | Applied to |
|---|---|---|---|---|
| `authLimiter` | 15 min (`RATE_LIMIT_WINDOW_MS`, default 900000ms) | 5 (`RATE_LIMIT_MAX_AUTH`) | IP only (no custom key generator) | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password` |
| `strictLimiter` | 1 hour | 3 (hardcoded, not env-configurable) | user ID if authenticated, else IP | `POST /api/auth/reset-password` |
| `apiLimiter` | 1 minute | 100 (`RATE_LIMIT_MAX_API`) | user ID if authenticated, else IP | Every route under `/api/*` globally (mounted in `app.js` before all API routers), **plus** explicitly re-applied to `/webhooks/stripe` and `/internal/emit`, which sit outside the `/api/*` prefix and would otherwise bypass it entirely |

Endpoints under `authLimiter`/`strictLimiter` are gated by **both** that limiter and the global `apiLimiter` — whichever trips first returns `429`. All three send `RateLimit-*` standard headers (`standardHeaders: true`, `legacyHeaders: false`).

Application-level (non-`express-rate-limit`) daily quotas, both returning `429 RATE_LIMITED`:
- **Scans:** `FREE_SCANS_PER_DAY` (default 3) per website per calendar day, free tier only — tracked in the `scanratelimits` collection (`{ userId, websiteId, date }`, TTL-cleaned after 2 days). Premium is unlimited.
- **AI chat messages:** `FREE_AI_MESSAGES_PER_DAY` (default 20) / `PREMIUM_AI_MESSAGES_PER_DAY` (default 200) per calendar day — counted live from `ChatMessage` documents with `role: 'user'` created since local midnight, not a separate counter.

---

## Pagination

Most list endpoints share the same response shape:
```json
{ "success": true, "data": { "<items>": [ /* ... */ ], "total": 42, "page": 1, "pages": 3 } }
```
with `page`/`limit` accepted as query params (`?page=2&limit=20`), `limit` clamped to a max of 50 everywhere it's used, defaulting to page 1 / limit 20.

**Not all list endpoints validate these params the same way**, which matters if you're building a client against this API:
- `GET /api/vulnerabilities` validates `page`/`limit` via Zod (`z.coerce.number()`) — an invalid value returns a clean `400 VALIDATION_ERROR`.
- `GET /api/websites`, `GET /api/scans/:id/findings`, `GET /api/websites/:websiteId/scans`, and `GET /api/reports` all parse `page`/`limit` manually with `parseInt(...) || default` and `Math.max`/`Math.min` clamping — an invalid value (e.g. `?page=abc`) silently falls back to the default rather than erroring.

