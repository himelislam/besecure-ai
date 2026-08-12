import { defineConfig, devices } from "@playwright/test";

// Runs against the REAL backend (server.js) + REAL worker (workers/index.js)
// + REAL MongoDB/Redis — nothing here is mocked. Start all three (and this
// dev server) before running `npx playwright test`. See e2e/README.md.
export default defineConfig({
  testDir: "./e2e",
  timeout: 240_000, // a real baseline scan + report generation both take real wall-clock time, more so on a busy shared dev machine
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // the whole suite is one sequential user journey — parallelism would just race itself
  // This drives a real browser against a real dev machine that's also running
  // the user's own Chrome/VS Code/etc. — one retry absorbs transient CPU
  // contention (confirmed via direct diagnosis: the app itself is stable:
  // a 12s post-submit stability check never regressed once) without masking
  // a real app bug, since a real bug would fail the retry identically.
  retries: 1,
  // Both output dirs live OUTSIDE dashboard/ (Vite's project root) on
  // purpose: writing video/trace/screenshot files into a directory Vite's
  // dev-server file watcher can see causes it to detect the writes as
  // source changes and push HMR full-reloads to the connected browser
  // *during* the test run — confirmed directly via a trace capture showing
  // repeated unexplained navigations back to /signup mid-interaction,
  // exactly correlated with e2e-results/ being inside the watched tree.
  reporter: [["list"], ["html", { open: "never", outputFolder: "../e2e-report" }]],
  outputDir: "../e2e-results",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    // Full trace (with screenshots/snapshots) hangs page.goto indefinitely
    // via CDP in this sandboxed environment — reproduced directly (works
    // instantly with screenshots/snapshots off, hangs identically with
    // either on). The lightweight trace below (actions, network, console)
    // still captures on failure; combined with the separate `screenshot`
    // and `video` options below, failures still get real visual evidence.
    trace: { mode: "retain-on-failure", screenshots: false, snapshots: false, sources: false },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
