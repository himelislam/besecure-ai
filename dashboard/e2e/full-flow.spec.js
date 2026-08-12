import { test, expect } from "@playwright/test";
import { getEmailVerificationToken } from "./helpers/db.js";

// One continuous, sequential user journey against the REAL backend + worker
// + MongoDB/Redis — nothing here is mocked. Each numbered step depends on
// state produced by the previous one (same user, same website, same scan),
// so it's written as a single test with named test.step() calls rather than
// independent tests: a failure partway through genuinely means the rest
// can't be meaningfully attempted, and test.step() still reports each
// step's own pass/fail/duration distinctly.
//
// Two steps (6. Chat, 7. Roadmap) call real Claude endpoints. Whether they
// succeed or hit the clean "temporarily unavailable" fallback depends on
// whether a working ANTHROPIC_API_KEY is configured in the environment this
// suite runs against — both branches are handled and asserted on directly
// rather than assuming one or the other.

const PASSWORD = "SuperSecret123!";
const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
const FAKE_DASHBOARD_DOMAINS = ["api.company.com", "shop.company.com", "company.com", "blog.company.com"];

test.describe.configure({ mode: "serial" });

test("full real user journey: register through billing", async ({ page }) => {
  test.setTimeout(240_000);

  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const nickname = `E2E Site ${stamp}`;

  const state = {};

  await test.step("1. Register -> verify email (single real request, StrictMode regression)", async () => {
    await page.goto("/signup");
    await page.fill('input[name="name"]', "E2E Flow User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.fill('input[name="confirmPassword"]', PASSWORD);
    await page.locator('input[type="checkbox"]').check();
    await page.click('button[type="submit"]');
    await expect(page.getByText(/verification link to/i).first()).toBeVisible({ timeout: 10_000 });

    const token = getEmailVerificationToken(email);

    let verifyRequestCount = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/verify-email")) verifyRequestCount += 1;
    });

    await page.goto(`/verify-email?token=${token}`);
    // Give any StrictMode double-invoke a chance to fire before asserting —
    // if the bug regressed, the second request would land within this window.
    await page.waitForTimeout(2000);

    expect(verifyRequestCount, "expected exactly one GET /api/auth/verify-email request").toBe(1);
    await expect(page.getByText(/you're all set/i)).toBeVisible();
    await expect(page.getByText(/couldn't verify|verification failed/i)).toHaveCount(0);
  });

  await test.step("2. Login -> add website -> real verification instructions -> unverifiable-target check", async () => {
    await page.goto("/signin");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/");

    await page.goto("/websites/add");
    await page.fill('input[name="nickname"]', nickname);
    await page.fill('input[name="url"]', "https://example.com");
    await page.click('button:has-text("Add Website")');
    await expect(page.getByText(/was added/i)).toBeVisible({ timeout: 10_000 });

    const instructionsText = await page.locator("body").innerText();
    expect(instructionsText).toContain("_security-audit-verify.example.com");
    expect(instructionsText).toMatch(/sav-verify-[0-9a-f-]{36}/i);
    expect(instructionsText).toContain('<meta name="security-audit-verify" content="sav-verify-');

    await page.click('a:has-text("Go to website details")');
    await page.waitForURL(/\/websites\/[a-f0-9]{24}$/);
    state.websiteId = page.url().match(/\/websites\/([a-f0-9]{24})$/)[1];

    // example.com genuinely has neither our DNS TXT record nor our meta tag
    // — this is a real verification attempt against a real unverifiable
    // target, not a mocked failure.
    await page.click('button:has-text("Check Verification")');
    await expect(page.getByText(/no matching dns txt record or meta tag was found/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/^(error|something went wrong)/i)).toHaveCount(0);
  });

  await test.step("3. Baseline scan -> live progress -> completed (not \"complete\") -> true-severity-sorted findings", async () => {
    let latestScanBody = null;
    page.on("response", async (res) => {
      if (/\/api\/scans\/[a-f0-9]{24}$/.test(res.url()) && res.request().method() === "GET") {
        try {
          latestScanBody = await res.json();
        } catch {
          // non-JSON response, ignore
        }
      }
    });

    await page.click('a:has-text("Start Security Scan")');
    await page.waitForURL(/\/scan$/);
    await expect(page.getByText("Choose Scan Type")).toBeVisible();
    await page.click('button:has-text("Start Security Scan")');
    await page.waitForURL(/\/scan\/results\?scanId=/);
    state.scanId = new URL(page.url()).searchParams.get("scanId");

    // Live progress: sample the progress percentage twice, a few seconds
    // apart, and confirm it actually moved — proof the UI is being driven
    // by real scan:progress socket events, not just a static "in progress" page.
    const progressText = () => page.locator("text=/%$/").first().innerText().catch(() => null);
    const firstSample = await progressText();
    await page.waitForTimeout(4000);
    const secondSample = await progressText();
    if (firstSample && secondSample) {
      expect(secondSample, "progress % should advance via live socket updates, not stay frozen").not.toBe(firstSample);
    }

    // Eventually connects live (vs. falling back to polling).
    await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText("Vulnerability Findings")).toBeVisible({ timeout: 60_000 });

    // The exact enum value from the backend must be "completed", not "complete".
    expect(latestScanBody?.data?.scan?.status).toBe("completed");

    const rows = page.locator("div.divide-y.divide-gray-100 > div");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    const findings = [];
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const title = await row.locator("h3").innerText();
      const severity = await row.locator("span.rounded-full").first().innerText();
      findings.push({ title, severity });
    }
    state.findings = findings;

    const ranks = findings.map((f) => SEVERITY_RANK[f.severity] ?? 99);
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    expect(ranks, "findings must render in true severity rank order, not raw backend string order").toEqual(
      sortedRanks
    );
  });

  await test.step('4. Open a finding -> "Verified" never offered as a status -> legal transition persists on reload', async () => {
    await page.locator("h3").first().click();
    await page.click('a:has-text("View full vulnerability details")');
    await page.waitForURL(/\/scans\/[a-f0-9]{24}\/vulnerabilities\/[a-f0-9]{24}/);
    await expect(page.getByText(/^Current status:/)).toBeVisible({ timeout: 15_000 });

    const moveButtons = page.locator('button:has-text("Move to")');
    const labels = await moveButtons.allInnerTexts();
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((l) => /verified/i.test(l)), `status options were: ${labels.join(", ")}`).toBe(false);

    const target = labels[0];
    await moveButtons.first().click();
    await expect(page.getByText(`Current status: ${target.replace(/^Move to /, "")}`)).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await expect(page.getByText(`Current status: ${target.replace(/^Move to /, "")}`)).toBeVisible({
      timeout: 10_000,
    });
  });

  await test.step("5. Dashboard reflects real created data, including the CriticalVulnerabilities widget", async () => {
    await page.goto("/");
    await expect(page.getByText("Vulnerabilities Requiring Attention")).toBeVisible({ timeout: 15_000 });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain(nickname);

    for (const fakeDomain of FAKE_DASHBOARD_DOMAINS) {
      expect(bodyText, `dashboard must not show the old fabricated ${fakeDomain} content`).not.toContain(fakeDomain);
    }

    // Cross-check the widget shows the SAME real finding data seen in step 3
    // (or a genuine all-clear if every finding got moved out of "open" —
    // step 4 only changed one, so at least one open finding should remain
    // unless the scan had none at all).
    const widget = page
      .locator('h3:has-text("Vulnerabilities Requiring Attention")')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    // The widget fetches its own data independently of the rest of the
    // dashboard — wait for ITS loading spinner to clear (not just for the
    // static header, which renders immediately) before reading its text.
    await expect(widget.getByText(/^All clear$/).or(widget.locator("a").first())).toBeVisible({
      timeout: 15_000,
    });
    const widgetText = await widget.innerText();
    const stillOpenTitles = state.findings.map((f) => f.title).filter((t) => widgetText.includes(t));
    if (state.findings.length > 0) {
      expect(
        widgetText.includes("All clear") || stillOpenTitles.length > 0,
        "widget should show either a genuine all-clear state or one of the real findings from this exact scan"
      ).toBe(true);
    }
  });

  await test.step("6. Chat: optimistic user bubble + real reply or clean 503 fallback (whichever is actually true here)", async () => {
    await page.goto("/ai-assistant");
    const message = `E2E chat check ${stamp}`;
    const textarea = page.getByPlaceholder("Ask anything about website security...");
    await textarea.fill(message);
    await textarea.locator("xpath=following-sibling::button[1]").click();

    await expect(page.getByText(message)).toBeVisible({ timeout: 10_000 });

    const aiBadge = page.getByText("AI-Assisted Guidance");
    const fallback = page.getByText(/temporarily unavailable/i);
    // A cold connection to the real Anthropic API (success or failure) can
    // take a while depending on network conditions — generous on purpose.
    await expect(aiBadge.or(fallback)).toBeVisible({ timeout: 40_000 });

    if (await aiBadge.isVisible()) {
      console.log("[e2e] Chat: real AI reply received (a working Anthropic key is configured).");
    } else {
      console.log("[e2e] Chat: clean 503 fallback shown (no working Anthropic key in this environment) — expected here.");
      await expect(page.getByText(/at Object\.|at async|\.js:\d+:\d+/i)).toHaveCount(0); // no raw stack trace leaked
    }
  });

  await test.step("7. Roadmap: synchronous loading state, week grouping, toggle persists (or clean failure, environment-dependent)", async () => {
    await page.goto(`/roadmap?scanId=${state.scanId}`);
    const generateBtn = page.getByRole("button", { name: /generate roadmap/i });
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    // Synchronous generation: the button itself flips into a disabled
    // "Generating..." state while the request is in flight.
    await expect(page.getByRole("button", { name: /generating/i })).toBeVisible({ timeout: 10_000 });

    const weekHeading = page.getByText(/^Week \d+$/).first();
    const failure = page.getByText(/temporarily unavailable/i);
    await expect(weekHeading.or(failure)).toBeVisible({ timeout: 40_000 });

    if (await weekHeading.isVisible()) {
      console.log("[e2e] Roadmap: real AI-generated roadmap received.");
      const weekLabels = await page.getByText(/^Week \d+$/).allInnerTexts();
      const weekNumbers = weekLabels.map((w) => parseInt(w.replace("Week ", ""), 10));
      expect(weekNumbers).toEqual([...weekNumbers].sort((a, b) => a - b));

      const toggleBtn = page.getByRole("button", { name: "Mark as done" }).first();
      await toggleBtn.click();
      await expect(page.getByRole("button", { name: "Mark as not done" }).first()).toBeVisible({ timeout: 10_000 });

      await page.reload();
      await expect(page.getByRole("button", { name: "Mark as not done" }).first()).toBeVisible({ timeout: 10_000 });
    } else {
      console.log("[e2e] Roadmap: clean failure shown (no working Anthropic key in this environment) — skipping week/toggle checks, nothing was generated to check.");
      await expect(page.getByRole("button", { name: /generate roadmap/i })).toBeVisible();
    }
  });

  await test.step('8. Report generation reaches "completed" with a real, working download link (auto-close regression)', async () => {
    await page.goto(`/websites/${state.websiteId}/scan/results?scanId=${state.scanId}`);
    const exportBtn = page.getByRole("button", { name: /export pdf/i });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });
    await exportBtn.click();

    await expect(page.getByText(/generating pdf report/i)).toBeVisible({ timeout: 10_000 });

    const downloadLink = page.getByRole("link", { name: /download pdf/i });
    await expect(downloadLink).toBeVisible({ timeout: 60_000 });
    const href = await downloadLink.getAttribute("href");
    expect(href, "download link must be a real Cloudinary URL, not empty/placeholder").toMatch(
      /^https:\/\/res\.cloudinary\.com\//
    );
  });

  await test.step('9. Billing checkout with placeholder Stripe credentials never leaks the raw key/error into the DOM', async () => {
    await page.goto("/subscription");
    const upgradeBtn = page.getByRole("button", { name: /upgrade plan/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 10_000 });
    await upgradeBtn.click();

    await expect(page.getByText(/payment processing is temporarily unavailable/i)).toBeVisible({ timeout: 15_000 });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toContain("sk_test");
    expect(bodyText.toLowerCase()).not.toContain("invalid api key");
  });
});
