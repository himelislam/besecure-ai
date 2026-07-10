import axios from 'axios';

const ZAP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes total budget
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

async function pollUntilComplete(statusUrl, deadline) {
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error('ZAP scan timed out');
    }
    // A long-running poll loop against a local/dev ZAP instance can hit a transient
    // connection reset (confirmed in testing — an occasional "socket hang up" mid-scan)
    // that has nothing to do with the scan itself; don't let one bad poll kill the scan.
    let status;
    try {
      const res = await zapGet(statusUrl, apiKeyParam());
      status = parseInt(res.data.status, 10);
    } catch {
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

  await zapGet(`${base}/JSON/spider/action/scan/`, { url: parsedUrl.toString(), ...apiKeyParam() });
  await pollUntilComplete(`${base}/JSON/spider/view/status/`, deadline);

  await zapGet(`${base}/JSON/ascan/action/scan/`, { url: parsedUrl.toString(), ...apiKeyParam() });
  await pollUntilComplete(`${base}/JSON/ascan/view/status/`, deadline);

  const alertsRes = await zapGet(`${base}/JSON/core/view/alerts/`, {
    baseurl: parsedUrl.toString(),
    ...apiKeyParam(),
  });

  return { alerts: alertsRes.data.alerts || [], _durationMs: Date.now() - start };
}

export default runZapBaseline;
