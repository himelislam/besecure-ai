import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  FiArrowLeft,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiClock,
  FiGlobe,
  FiDownload,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiXCircle,
  FiWifi,
  FiTrendingUp,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { getScan, getScanFindings, getWebsiteScans } from "../../services/scanService";
import { sendMessage } from "../../services/chatService";
import { socket, connectSocket } from "../../lib/socketClient";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";
import { useReportForScan } from "../../hooks/useReportForScan";
import { sortBySeverity, SEVERITY_LABELS } from "../../lib/vulnerabilityRules";
import { SCAN_STATUS_LABELS, getStageLabel } from "../../lib/scanRules";

const POLL_INTERVAL_MS = 5000;
const FINDINGS_LIMIT = 50; // max the backend allows — covers virtually all real scans in one page

const severityStyles = {
  critical: { badge: "bg-red-100 text-red-700", icon: "bg-red-50 text-red-600" },
  high: { badge: "bg-orange-100 text-orange-700", icon: "bg-orange-50 text-orange-600" },
  medium: { badge: "bg-yellow-100 text-yellow-700", icon: "bg-yellow-50 text-yellow-600" },
  low: { badge: "bg-blue-100 text-blue-700", icon: "bg-blue-50 text-blue-600" },
  info: { badge: "bg-gray-100 text-gray-700", icon: "bg-gray-50 text-gray-600" },
};

function scoreLevel(score) {
  if (score == null) return { label: "—", color: "text-gray-400", bar: "bg-gray-300" };
  if (score >= 80) return { label: "Good", color: "text-green-600", bar: "bg-green-500" };
  if (score >= 60) return { label: "Needs Improvement", color: "text-yellow-600", bar: "bg-yellow-500" };
  return { label: "Poor", color: "text-red-600", bar: "bg-red-500" };
}

export default function ScanResults() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryScanId = searchParams.get("scanId");

  const [scanId, setScanId] = useState(queryScanId);
  const [isResolvingScanId, setIsResolvingScanId] = useState(!queryScanId);

  const [scan, setScan] = useState(null);
  const [isLoadingScan, setIsLoadingScan] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [findings, setFindings] = useState([]);
  const [findingsTotal, setFindingsTotal] = useState(0);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const [liveConnected, setLiveConnected] = useState(socket.connected);

  // Not persisted anywhere — GET /api/chat/history has no scanId filter, so
  // there's no way to fetch a previously-generated analysis back on reload.
  // Each visit starts from a clean "not generated yet" state, same as the
  // roadmap page's generate button pattern.
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const pollRef = useRef(null);

  const reportState = useReportForScan(scanId);

  // Resolve a scanId when the page is opened without ?scanId= (e.g. someone
  // bookmarked /websites/:id/scan/results) — fall back to the website's
  // most recent scan.
  useEffect(() => {
    if (queryScanId) return;

    let cancelled = false;

    getWebsiteScans(id, { page: 1, limit: 1 })
      .then((data) => {
        if (cancelled) return;
        if (data.scans[0]) {
          setScanId(data.scans[0]._id);
        } else {
          setLoadError("This website hasn't been scanned yet.");
          setIsLoadingScan(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getApiError(err).message);
          setIsLoadingScan(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsResolvingScanId(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, queryScanId]);

  const fetchFindings = (targetScanId) => {
    setIsLoadingFindings(true);

    getScanFindings(targetScanId, { page: 1, limit: FINDINGS_LIMIT })
      .then((data) => {
        setFindings(sortBySeverity(data.vulnerabilities));
        setFindingsTotal(data.total);
      })
      .catch((err) => setLoadError(getApiError(err).message))
      .finally(() => setIsLoadingFindings(false));
  };

  const applyScan = (updated) => {
    setScan(updated);

    if (updated.status === "completed") {
      fetchFindings(updated._id);
    }
  };

  // Initial load + polling fallback. Polling is the source of truth for
  // "did this stop being queued/running" even when sockets are working —
  // it's just a slower backstop.
  useEffect(() => {
    if (!scanId) return;

    let cancelled = false;
    setIsLoadingScan(true);
    setLoadError("");

    const poll = () => {
      getScan(scanId)
        .then(({ scan: fetched }) => {
          if (cancelled) return;
          applyScan(fetched);

          if (fetched.status === "queued" || fetched.status === "running") {
            pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        })
        .catch((err) => {
          if (!cancelled) setLoadError(getApiError(err).message);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingScan(false);
        });
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  // Live updates — server emits scan:progress / scan:complete / scan:failed
  // (see server/services/queue/scanWorker.js) to the user's socket room.
  // These update the UI immediately; polling above is just the fallback.
  useEffect(() => {
    if (!scanId) return;

    connectSocket();

    const onProgress = (data) => {
      if (data.scanId !== scanId) return;
      setScan((prev) => (prev ? { ...prev, progress: data.progress, progressMessage: data.stage } : prev));
    };

    const onComplete = (data) => {
      if (data.scanId !== scanId) return;
      // The event payload is partial (score/grade/findingCounts only) —
      // refetch the full scan document for toolsRun/completedAt/durationMs.
      getScan(scanId)
        .then(({ scan: fetched }) => applyScan(fetched))
        .catch((err) => setLoadError(getApiError(err).message));
    };

    const onFailed = (data) => {
      if (data.scanId !== scanId) return;
      setScan((prev) => (prev ? { ...prev, status: "failed", error: data.error } : prev));
    };

    const onConnect = () => setLiveConnected(true);
    const onDisconnect = () => setLiveConnected(false);

    socket.on("scan:progress", onProgress);
    socket.on("scan:complete", onComplete);
    socket.on("scan:failed", onFailed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("scan:progress", onProgress);
      socket.off("scan:complete", onComplete);
      socket.off("scan:failed", onFailed);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
    // applyScan only closes over stable setState functions, safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  const toggleExpanded = (findingId) => {
    setExpanded(expanded === findingId ? null : findingId);
  };

  const handleGenerateAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    setAnalysisError("");

    try {
      const { message, aiAssisted } = await sendMessage({
        content:
          "Give a brief overall security assessment of this scan's findings — 2-3 sentences on the site's overall posture and what to prioritize fixing first.",
        scanId,
      });

      setAiAnalysis({ content: message.content, aiAssisted });
    } catch (err) {
      const apiError = getApiError(err);

      if (apiError.code === ErrorCodes.RATE_LIMITED && apiError.message.includes("Daily AI message limit")) {
        setAnalysisError("You've used your AI messages for today — resets at midnight.");
      } else if (
        apiError.code === ErrorCodes.AI_UNAVAILABLE ||
        apiError.code === ErrorCodes.INTERNAL_ERROR ||
        apiError.status === 500
      ) {
        // Same soft message as the chat page — covers both the real 503
        // AI_UNAVAILABLE and the documented-but-unwrapped generic 500 this
        // endpoint can return when the Claude call itself fails.
        setAnalysisError("The assistant is temporarily unavailable. Please try again.");
      } else {
        setAnalysisError(apiError.message);
      }
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  if (isResolvingScanId || (isLoadingScan && !scan)) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
      </div>
    );
  }

  if (loadError && !scan) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <FiAlertTriangle className="text-3xl text-red-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300">{loadError}</p>
        <Link
          to={`/websites/${id}/scan`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Start a scan
        </Link>
      </div>
    );
  }

  const isInProgress = scan.status === "queued" || scan.status === "running";
  const level = scoreLevel(scan.score);

  return (
    <>
      <PageMeta
        title="Scan Results | BeSecure AI"
        description="Security scan results and vulnerability analysis"
      />

      <div className="space-y-6">
        {/* ================= HEADER ================= */}
        <div>
          <Link
            to={`/websites/${id}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-brand-500"
          >
            <FiArrowLeft />
            Back to Website
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <FiShield className="text-xl" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Scan Results
                </h1>

                <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                  <FiGlobe className="text-xs" />
                  {scan.targetUrl}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  liveConnected ? "text-green-500" : "text-gray-400"
                }`}
                title={liveConnected ? "Live updates connected" : "Live updates not connected — falling back to polling"}
              >
                <FiWifi />
                {liveConnected ? "Live" : "Polling"}
              </span>

              {scan.status === "completed" && (
                <Link
                  to={`/roadmap?scanId=${scan._id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                >
                  <FiTrendingUp />
                  View Roadmap
                </Link>
              )}

              {!isInProgress && (
                <Link
                  to={`/websites/${id}/scan`}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  <FiRefreshCw />
                  Scan Again
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ================= IN PROGRESS ================= */}
        {isInProgress && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand-500 text-white">
                <FiShield />
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  {SCAN_STATUS_LABELS[scan.status]}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {getStageLabel(scan.progressMessage)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {getStageLabel(scan.progressMessage)}
                </span>

                <span className="text-xs font-semibold text-brand-500">
                  {scan.progress ?? 0}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${scan.progress ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= FAILED ================= */}
        {scan.status === "failed" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                <FiXCircle />
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Scan failed</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {scan.error || "The scan could not be completed."}
                </p>

                <Link
                  to={`/websites/${id}/scan`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <FiRefreshCw />
                  Try again
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ================= COMPLETED ================= */}
        {scan.status === "completed" && (
          <>
            {/* WEBSITE INFO */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800">
                    <FiGlobe />
                  </div>

                  <a
                    href={scan.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500"
                  >
                    {scan.targetUrl}
                    <FiExternalLink className="text-xs" />
                  </a>
                </div>

                <div className="flex flex-wrap gap-5 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FiClock />
                    <span>{scan.durationMs != null ? `${(scan.durationMs / 1000).toFixed(0)}s` : "—"}</span>
                  </div>

                  <div className="text-gray-500">
                    Scanned:{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : "—"}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    <FiCheckCircle />
                    {SCAN_STATUS_LABELS[scan.status]}
                  </span>
                </div>
              </div>

              {scan.error && (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                  <FiAlertTriangle />
                  {scan.error}
                </p>
              )}
            </div>

            {/* SCORE + SUMMARY */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Security Score</p>

                    <h2 className="mt-2 text-4xl font-bold text-gray-800 dark:text-white/90">
                      {scan.score ?? "—"}
                      <span className="text-xl text-gray-400">/100</span>
                    </h2>
                  </div>

                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-2xl font-bold text-gray-700 dark:text-gray-200">{scan.grade ?? "—"}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-gray-500">Security level</span>
                    <span className={`font-medium ${level.color}`}>{level.label}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${scan.score ?? 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm text-gray-500">Findings by Severity</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  {Object.entries(scan.findingCounts || {}).map(([severity, value]) => (
                    <div
                      key={severity}
                      className={`rounded-xl p-4 ${severityStyles[severity]?.icon || "bg-gray-50 text-gray-600"}`}
                    >
                      <p className="text-xs font-medium">{SEVERITY_LABELS[severity] || severity}</p>
                      <p className="mt-1 text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <FiCheckCircle />
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Tools Run</p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
                      {(scan.toolsRun || []).length}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {(scan.toolsRun || []).map((tool) => (
                    <div key={tool.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{tool.name}</span>
                      <span className={tool.status === "success" ? "text-green-600" : "text-red-500"}>
                        {tool.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* VULNERABILITIES */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      Vulnerability Findings
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Sorted by severity (critical first) — server order isn't real severity order, resorted client-side.
                    </p>
                  </div>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                    {findingsTotal} finding{findingsTotal === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {isLoadingFindings && (
                <div className="flex items-center justify-center py-12">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                </div>
              )}

              {!isLoadingFindings && findings.length === 0 && (
                <div className="py-12 text-center">
                  <FiCheckCircle className="mx-auto text-3xl text-green-400" />
                  <p className="mt-3 text-sm text-gray-500">No findings — nothing to see here.</p>
                </div>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {!isLoadingFindings &&
                  findings.map((finding) => {
                    const styles = severityStyles[finding.severity] || severityStyles.info;
                    const isExpanded = expanded === finding._id;

                    return (
                      <div key={finding._id} className="p-5 sm:p-6">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(finding._id)}
                          className="flex w-full items-start gap-4 text-left"
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                            <FiAlertTriangle />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <h3 className="font-medium text-gray-800 dark:text-white/90">{finding.title}</h3>

                              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}>
                                {SEVERITY_LABELS[finding.severity] || finding.severity}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>{finding.category}</span>
                              <span>•</span>
                              <span>{finding.owaspCategory} — {finding.owaspTitle}</span>
                            </div>
                          </div>

                          <div className="text-gray-400">{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                        </button>

                        {isExpanded && (
                          <div className="ml-14 mt-5 space-y-5">
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <FiInfo className="text-gray-400" />
                                <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">Description</h4>
                              </div>

                              <p className="text-sm leading-6 text-gray-500">{finding.description}</p>
                            </div>

                            <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/5">
                              <div className="mb-2 flex items-center gap-2">
                                <FiCheckCircle className="text-brand-500" />
                                <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">
                                  Recommended Remediation
                                </h4>
                              </div>

                              <p className="text-sm leading-6 text-gray-600">{finding.recommendation}</p>
                            </div>

                            <Link
                              to={`/scans/${scan._id}/vulnerabilities/${finding._id}`}
                              className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600"
                            >
                              View full vulnerability details
                              <FiExternalLink />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ================= AI ANALYSIS ================= */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <FiShield className="text-xl" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        AI Security Analysis
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Get a real, AI-generated read on this scan's findings — sent via the
                        AI assistant with this scan attached as context.
                      </p>
                    </div>

                    {aiAnalysis?.aiAssisted && (
                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-500 shadow-sm">
                        AI-Assisted Guidance
                      </span>
                    )}
                  </div>

                  {!aiAnalysis && !isGeneratingAnalysis && (
                    <div className="mt-5 flex flex-col items-start gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        {analysisError || "No analysis generated yet for this scan."}
                      </p>

                      <button
                        type="button"
                        onClick={handleGenerateAnalysis}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                      >
                        {analysisError ? <FiRefreshCw /> : null}
                        {analysisError ? "Retry" : "Generate AI Analysis"}
                      </button>
                    </div>
                  )}

                  {isGeneratingAnalysis && (
                    <div className="mt-5 flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm">
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                      <p className="text-sm text-gray-500">Asking the AI assistant about this scan...</p>
                    </div>
                  )}

                  {aiAnalysis && !isGeneratingAnalysis && (
                    <div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
                      <h3 className="font-medium text-gray-800 dark:text-white/90">
                        Overall Assessment
                      </h3>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-500">
                        {aiAnalysis.content}
                      </p>

                      <button
                        type="button"
                        onClick={handleGenerateAnalysis}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600"
                      >
                        <FiRefreshCw className="h-3.5 w-3.5" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ReportPanel reportState={reportState} />
          </>
        )}
      </div>
    </>
  );
}

function ReportPanel({ reportState }) {
  const { report, isStarting, error, limitMessage, generate } = reportState;

  return (
    <div className="flex flex-col items-end gap-2">
      {limitMessage && <p className="max-w-md text-right text-xs text-amber-600">{limitMessage}</p>}
      {error && <p className="max-w-md text-right text-xs text-red-500">{error}</p>}

      <div className="flex justify-end">
        {report?.status === "completed" && report.cloudinaryUrl ? (
          <a
            href={report.cloudinaryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <FiDownload />
            Download PDF
          </a>
        ) : report?.status === "generating" ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
            Generating PDF report...
          </span>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={isStarting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-500" />
            ) : report?.status === "failed" ? (
              <FiRefreshCw />
            ) : (
              <FiDownload />
            )}
            {report?.status === "failed" ? "Retry PDF Export" : "Export PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
