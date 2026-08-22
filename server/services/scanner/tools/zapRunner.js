import axios from 'axios';

// 15 minutes total budget by default. Deep scans are already async (BullMQ + Socket.io
// progress events), so a longer wall-clock budget doesn't block anything — and ZAP's own
// active-scan policy is comprehensive by design (confirmed: unbounded by default, ~67min
// projected against a real site). setOptionMaxScanDurationInMins below still caps ZAP
// itself so we always get back whatever real alerts it found rather than nothing.
const ZAP_TIMEOUT_MS = parseInt(process.env.ZAP_TIMEOUT_MS, 10) || 15 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;
// ZAP compares an incoming request's Host header port against the port it's actually
// listening on internally to decide whether the request is for its own API or should
// be proxied elsewhere. docker-compose maps our external ZAP_API_URL port (8090) to a
// different internal one (the container's -port 8080), so without overriding the Host
// header, every request gets misread as "please proxy this to host:8090" and fails
// with a connection-refused error against ZAP's own external port. Confirmed via direct
// testing — api.disablekey=true alone does not fix this; two things were required:
// api.addrs.addr.regex=true (permitted-address allowlist) in docker-compose, plus this.
const ZAP_INTERNAL_PORT = process.env.ZAP_INTERNAL_PORT || '8080';

function zapApiUrl() {
  return process.env.ZAP_API_URL || 'http://localhost:8090';
}

function zapHostHeader() {
  const { hostname } = new URL(zapApiUrl());
  return `${hostname}:${ZAP_INTERNAL_PORT}`;
}

function apiKeyParam() {
  return process.env.ZAP_API_KEY ? { apikey: process.env.ZAP_API_KEY } : {};
}

async function zapGet(url, params) {
  return axios.get(url, { params, headers: { Host: zapHostHeader() } });
}

async function pollUntilComplete(statusUrl, deadline, scanId) {
  // Tracks the most recent poll failure so a real timeout error says *why* ZAP never
  // reported completion (connection refused, 403 "not permitted", etc.) instead of the
  // bare "timed out", which was indistinguishable from a genuinely slow scan and masked
  // a production ZAP connectivity/config problem for days.
  let lastError = null;

  for (;;) {
    if (Date.now() > deadline) {
      const detail = lastError ? `: ${lastError}` : ' (no successful status response was ever received)';
      throw new Error(`ZAP scan timed out${detail}`);
    }
    // A long-running poll loop against a local/dev ZAP instance can hit a transient
    // connection reset (confirmed in testing — an occasional "socket hang up" mid-scan)
    // that has nothing to do with the scan itself; don't let one bad poll kill the scan.
    let status;
    try {
      const res = await zapGet(statusUrl, { scanId, ...apiKeyParam() });
      status = parseInt(res.data.status, 10);
      lastError = null;
    } catch (err) {
      // A scanId that ZAP reports as not existing can never start existing again —
      // retrying it for the rest of the budget is guaranteed to fail and throws away
      // every alert the scan already found. Observed in practice (cause not fully
      // pinned down — possibly overlapping scans against the same ZAP instance) as
      // "ZAP scan timed out: ... does_not_exist" after a long, otherwise-real scan.
      // Treat it as "the scan is over" and let the caller fetch whatever alerts exist,
      // same as a clean status:100 — a real partial result beats a manufactured failure.
      if (err.response?.data?.code === 'does_not_exist') return;
      lastError = err.response
        ? `HTTP ${err.response.status} from ZAP API (${JSON.stringify(err.response.data).slice(0, 200)})`
        : err.message;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }
    if (status >= 100) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ZAP is a REST API service (Docker container), never a subprocess — see docs/09_SECURITY_RULES.md.
export async function runZapBaseline(targetUrl) {
  const start = Date.now();
  const deadline = start + ZAP_TIMEOUT_MS;
  const parsedUrl = new URL(targetUrl); // validate before ever sending it anywhere
  const base = zapApiUrl();

  // action/scan/ returns the started scan's own id (e.g. {"scan":"0"}) — view/status/
  // needs that id back as `scanId` to know *which* scan to report on. Omitting it
  // isn't a harmless default: ZAP's API rejects the status call outright
  // (ApiException: DOES_NOT_EXIST (scanId)), and pollUntilComplete's per-poll retry
  // silently swallows that rejection every 2s until the deadline — surfacing as a
  // generic "ZAP scan timed out" no matter how fast or trivial the actual scan is.
  // Confirmed directly against the ZAP container logs.
  const spiderStart = await zapGet(`${base}/JSON/spider/action/scan/`, { url: parsedUrl.toString(), ...apiKeyParam() });
  await pollUntilComplete(`${base}/JSON/spider/view/status/`, deadline, spiderStart.data.scan);

  // ZAP's active scan has NO duration cap by default (confirmed: optionMaxScanDurationInMins
  // is 0, i.e. unbounded) — it runs its full policy (every rule x every discovered
  // form/param) until naturally done, which on a real site can take far longer than any
  // timeout we'd want to wait on (measured: ~3% progress in 2 minutes against a real
  // target, i.e. over an hour projected). Without this, hitting our own ZAP_TIMEOUT_MS
  // just throws the whole scan away with zero findings. Telling ZAP itself to stop after
  // N minutes makes it return whatever real alerts it already found instead — same
  // mechanism a human running ZAP would use, not a workaround.
  const remainingMs = deadline - Date.now();
  const maxScanMins = Math.max(1, Math.floor((remainingMs - 30000) / 60000));
  await zapGet(`${base}/JSON/ascan/action/setOptionMaxScanDurationInMins/`, {
    Integer: maxScanMins,
    ...apiKeyParam(),
  });

  const ascanStart = await zapGet(`${base}/JSON/ascan/action/scan/`, { url: parsedUrl.toString(), ...apiKeyParam() });
  await pollUntilComplete(`${base}/JSON/ascan/view/status/`, deadline, ascanStart.data.scan);

  const alertsRes = await zapGet(`${base}/JSON/core/view/alerts/`, {
    baseurl: parsedUrl.toString(),
    ...apiKeyParam(),
  });

  return { alerts: alertsRes.data.alerts || [], _durationMs: Date.now() - start };
}

export default runZapBaseline;
