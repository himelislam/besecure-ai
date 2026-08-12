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
