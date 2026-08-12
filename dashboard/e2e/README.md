# E2E suite

Playwright tests that drive the real app in a real browser against the real
backend + worker + MongoDB/Redis — nothing is mocked. This is a regression
guard for the actual frontend/backend contract, not a substitute for the
`server/__tests__/` integration suite or unit tests.

## Prerequisites

Start all of these first (each in its own terminal, from the repo root
unless noted):

1. MongoDB + Redis running (`docker/docker-compose.dev.yml`, or local installs).
2. Backend API: `cd server && npm run dev` (port 5000/5001 per `server/.env`).
3. Scan/report worker: `cd server && npm run worker`.
4. This dashboard's dev server: `cd dashboard && npm run dev` (port 5173).
5. `mongosh` must be on `PATH` — `e2e/helpers/db.js` shells out to it to read
   a fresh account's real email-verification token directly from the DB
   (there's no test inbox to read a real email from).

Then, from `dashboard/`:

```
npm run test:e2e
```

## What it covers

One continuous `full-flow.spec.js` walks a single real user through
register → verify → login → add + verify a website → run a baseline scan →
open a finding and change its status → check the dashboard → chat → generate
a roadmap → generate a PDF report → attempt billing checkout. Each stage is
a named `test.step()`, so a run reports pass/fail per step even though it's
one `test()` (later steps depend on state — website id, scan id, findings —
produced by earlier ones, so independent tests would mean re-running most of
the flow anyway).

Two steps (chat, roadmap) call the real Claude API. Whether they hit the
real success path or the clean `AI_UNAVAILABLE` fallback depends entirely on
whether a working `ANTHROPIC_API_KEY` is configured for the backend in the
environment this suite runs against — the test detects which one actually
happened and asserts accordingly (logging which branch it took), rather than
assuming either one.

## Gotcha: keep test output OUTSIDE `dashboard/`

`playwright.config.js`'s `outputDir` and the HTML reporter's `outputFolder`
both point one level up (`../e2e-results`, `../e2e-report`), **not** inside
`dashboard/`. This is deliberate, not a style choice — Vite's dev-server file
watcher covers the whole project root, and screenshots/videos/traces get
written to disk *while the test's browser page is still open and connected
to Vite's HMR websocket*. Point that output back inside `dashboard/` and
Vite will detect its own dev server's traffic as a source change and push
full-reloads to the page mid-test, wiping in-progress form state and causing
confusing, seemingly-random failures with no code bug behind them at all
(confirmed directly via a trace capture showing unexplained navigations back
to `/signup` mid-keystroke). If you ever need to relocate the output dirs
again, keep them outside every Vite project root in the repo.

## Gotcha: full trace mode (screenshots/snapshots) can hang `page.goto`

In some sandboxed/CI environments, Playwright's trace recording with
`screenshots`/`snapshots` enabled has been observed to hang CDP-level calls
indefinitely (reproduced directly: identical actions succeed instantly with
those two off, hang identically with either on). `playwright.config.js`
therefore runs a lightweight trace (`screenshots: false, snapshots: false,
sources: false`) — still captures the action log, console, and network
timeline on failure. Visual evidence on failure still comes from the
separate `screenshot: "only-on-failure"` and `video: "retain-on-failure"`
options, neither of which showed this problem. If traces come back clean in
your environment, feel free to re-enable the full mode.
