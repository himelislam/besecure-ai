// Mirrors the real scan lifecycle from server/services/queue/scanWorker.js —
// status values and the `stage` strings emitted with `scan:progress`.

// scan.status enum — "completed", NOT "complete".
export const SCAN_STATUS_LABELS = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

// `stage` values passed to emitProgress(...) in scanWorker.js, in the order
// a scan actually moves through them (deep scans hit all of them; baseline
// scans stop after ssl-checked).
export const SCAN_STAGE_LABELS = {
  starting: "Starting scan",
  "headers-checked": "Security headers checked",
  "ssl-checked": "SSL/TLS checked",
  "active-scan-checked": "Active vulnerability scan running",
  "cve-checked": "Checking for known CVEs",
  "tls-vulns-checked": "Checking TLS vulnerabilities",
  complete: "Complete",
};

export function getStageLabel(stage) {
  return SCAN_STAGE_LABELS[stage] || "Working...";
}

// Worst-case total wall-clock budget per scan type, mirroring the per-tool timeout
// defaults in server/services/scanner/tools/*Runner.js (ZAP_TIMEOUT_MS 15min +
// NUCLEI_TIMEOUT_MS 5min + TESTSSL_TIMEOUT_MS 3min for deep scans, on top of the
// baseline observatory/sslyze steps every scan runs). These are estimates for a
// progress UI, not a hard contract — if the server-side env defaults are tuned,
// update these to match rather than expecting them to stay derived automatically.
const BASELINE_ESTIMATE_MS = 90 * 1000; // observatory + sslyze
const DEEP_ESTIMATE_MS = BASELINE_ESTIMATE_MS + (15 + 5 + 3) * 60 * 1000; // + zap + nuclei + testssl

export function getEstimatedMaxDurationMs(scanType) {
  return scanType === "deep" ? DEEP_ESTIMATE_MS : BASELINE_ESTIMATE_MS;
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
