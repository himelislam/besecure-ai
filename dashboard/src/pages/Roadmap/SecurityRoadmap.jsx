import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiInfo,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiTarget,
  FiZap,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { useAllScans } from "../../hooks/useAllScans";
import { generateRoadmap, getRoadmap, toggleRoadmapStep } from "../../services/roadmapService";
import { getApiError } from "../../lib/apiResponse";

const SEVERITY_STYLES = {
  critical: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  high: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  medium: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400",
  low: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  info: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatRelative(dateString) {
  if (!dateString) return "";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function groupStepsByWeek(steps) {
  const byWeek = new Map();
  steps.forEach((step) => {
    if (!byWeek.has(step.week)) byWeek.set(step.week, []);
    byWeek.get(step.week).push(step);
  });
  return [...byWeek.entries()].sort(([a], [b]) => a - b);
}

const Roadmap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryScanId = searchParams.get("scanId");
  const { scans, isLoading: isLoadingScans } = useAllScans();
  const completedScans = scans.filter((s) => s.status === "completed");

  const [scanId, setScanId] = useState(queryScanId || "");

  useEffect(() => {
    // Default to the most recent completed scan once scans have loaded, if
    // nothing was specified via the URL.
    if (!queryScanId && !scanId && completedScans.length > 0) {
      setScanId(completedScans[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedScans.length]);

  const [roadmap, setRoadmap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadErrorType, setLoadErrorType] = useState(""); // "scan" | "roadmap" | "other" | ""
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [togglingStepId, setTogglingStepId] = useState(null);

  const loadRoadmap = (id) => {
    setIsLoading(true);
    setRoadmap(null);
    setLoadErrorType("");
    setLoadErrorMessage("");
    setGenerateError("");

    getRoadmap(id)
      .then(({ roadmap: fetched }) => setRoadmap(fetched))
      .catch((err) => {
        const apiError = getApiError(err);

        if (apiError.message === "Scan not found") {
          setLoadErrorType("scan");
        } else if (apiError.message === "Roadmap not found") {
          setLoadErrorType("roadmap"); // not an error — show the generate CTA
        } else {
          setLoadErrorType("other");
          setLoadErrorMessage(apiError.message);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (scanId) loadRoadmap(scanId);
  }, [scanId]);

  const handleSelectScan = (id) => {
    setScanId(id);
    setSearchParams(id ? { scanId: id } : {});
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError("");

    try {
      const { roadmap: generated } = await generateRoadmap(scanId);
      setRoadmap(generated);
      setLoadErrorType("");
    } catch (err) {
      // The roadmap doc is saved server-side as status:'failed' — retrying
      // calls the same endpoint again, which reuses that document rather
      // than creating a duplicate (scanId is unique per roadmap).
      setGenerateError(getApiError(err).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleStep = async (stepId) => {
    setTogglingStepId(stepId);

    try {
      const { roadmap: updated } = await toggleRoadmapStep(roadmap._id, stepId);
      setRoadmap(updated);
    } catch (err) {
      setGenerateError(getApiError(err).message);
    } finally {
      setTogglingStepId(null);
    }
  };

  const weeks = useMemo(() => groupStepsByWeek(roadmap?.steps || []), [roadmap]);
  const completedSteps = (roadmap?.steps || []).filter((s) => s.isDone);
  const progress = roadmap?.steps?.length
    ? Math.round((completedSteps.length / roadmap.steps.length) * 100)
    : 0;

  return (
    <>
      <PageMeta
        title="Security Roadmap | SecureSphere"
        description="AI-powered security improvement roadmap"
      />

      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-cyan-500">
              <FiZap />
              AI-POWERED SECURITY ROADMAP
            </div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Security Roadmap
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              A prioritized, week-by-week remediation plan generated from a scan's findings.
            </p>
          </div>

          <Link
            to="/ai-assistant"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-cyan-500 hover:text-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <FiZap />
            Ask AI Assistant
          </Link>
        </div>

        {/* SCAN SELECTOR */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Scan
          </label>

          {isLoadingScans ? (
            <p className="text-sm text-gray-500">Loading your scans...</p>
          ) : completedScans.length === 0 ? (
            <p className="text-sm text-gray-500">
              No completed scans yet.{" "}
              <Link to="/websites" className="font-medium text-cyan-600 hover:text-cyan-700">
                Run a scan first
              </Link>
              .
            </p>
          ) : (
            <select
              value={scanId}
              onChange={(e) => handleSelectScan(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:max-w-md"
            >
              {completedScans.map((scan) => (
                <option key={scan._id} value={scan._id}>
                  {scan.targetUrl} — {new Date(scan.createdAt).toLocaleDateString()} (score {scan.score ?? "—"})
                </option>
              ))}
            </select>
          )}
        </div>

        {!scanId && !isLoadingScans && completedScans.length > 0 && (
          <p className="text-sm text-gray-500">Pick a scan above to view or generate its roadmap.</p>
        )}

        {scanId && isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
          </div>
        )}

        {scanId && !isLoading && loadErrorType === "scan" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-500/20 dark:bg-red-500/5">
            <FiAlertTriangle className="text-3xl text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">
              That scan doesn't exist, or isn't yours.
            </p>
          </div>
        )}

        {scanId && !isLoading && loadErrorType === "other" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-500/20 dark:bg-red-500/5">
            <FiAlertTriangle className="text-3xl text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{loadErrorMessage}</p>
            <button
              type="button"
              onClick={() => loadRoadmap(scanId)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        )}

        {/* NO ROADMAP YET — generate CTA, not an error */}
        {scanId && !isLoading && loadErrorType === "roadmap" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-200 bg-cyan-50 py-14 text-center dark:border-cyan-500/20 dark:bg-cyan-500/5">
            <FiZap className="text-3xl text-cyan-500" />
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-white">
                No roadmap generated yet for this scan
              </h2>
              <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Generate an AI-powered, week-by-week remediation plan from this scan's findings.
              </p>
            </div>

            {generateError && (
              <p className="max-w-md text-sm text-red-600">{generateError}</p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating roadmap...
                </>
              ) : (
                <>
                  <FiZap />
                  Generate Roadmap
                </>
              )}
            </button>
          </div>
        )}

        {/* ROADMAP CONTENT */}
        {scanId && !isLoading && roadmap && (
          <>
            {/* SCORE / PROGRESS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                  <FiShield className="h-5 w-5 text-cyan-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Starting Score</p>

                <div className="mt-1 flex items-end gap-2">
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {roadmap.estimatedStartScore}
                  </h3>
                  <span className="mb-1 text-sm text-gray-400">/100</span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
                  <FiTarget className="h-5 w-5 text-purple-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Estimated Score After</p>

                <div className="mt-1 flex items-end gap-2">
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {roadmap.estimatedEndScore}
                  </h3>
                  <span className="mb-1 text-sm text-gray-400">/100</span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                    <FiCheckCircle className="h-5 w-5 text-green-500" />
                  </div>

                  <span className="text-xs font-medium text-gray-400">
                    {completedSteps.length}/{roadmap.steps.length} complete
                  </span>
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Roadmap Progress</p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-gray-400">{progress}% completed</p>
              </div>
            </div>

            {/* SUMMARY */}
            {roadmap.summary && (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white">
                    <FiZap className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-800 dark:text-white">AI Summary</h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-cyan-600 shadow-sm dark:bg-gray-900">
                        AI-Assisted Guidance
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {roadmap.summary}
                    </p>
                  </div>

                  <Link
                    to="/ai-assistant"
                    className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                  >
                    Get AI guidance
                    <FiArrowRight />
                  </Link>
                </div>
              </div>
            )}

            {generateError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {generateError}
              </div>
            )}

            {/* TABS */}
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03] md:w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "all" ? "bg-cyan-500 text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Improvement Plan
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === "completed" ? "bg-cyan-500 text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Completed ({completedSteps.length})
              </button>
            </div>

            {/* WEEK-BY-WEEK PLAN */}
            {activeTab === "all" && (
              <div className="space-y-6">
                {weeks.map(([week, steps]) => (
                  <div key={week} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Week {week}
                      </h2>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {steps.map((step) => (
                        <RoadmapStep
                          key={step._id}
                          step={step}
                          isToggling={togglingStepId === step._id}
                          onToggle={() => handleToggleStep(step._id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COMPLETED */}
            {activeTab === "completed" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                {completedSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <FiCheckCircle className="h-6 w-6 text-gray-400" />
                    </div>

                    <h3 className="mt-4 font-semibold text-gray-800 dark:text-white">
                      No completed steps yet
                    </h3>

                    <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                      Check off roadmap steps as you complete them to track progress here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedSteps.map((step) => (
                      <div
                        key={step._id}
                        className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-500/20 dark:bg-green-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <FiCheckCircle className="h-5 w-5 text-green-500" />

                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{step.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Week {step.week} · completed {formatRelative(step.completedAt)}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-green-500">+{step.estimatedScoreGain} score</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-center gap-2 pb-2 text-xs text-gray-400">
          <FiLock />
          Security recommendations are based on the selected scan's results.
        </div>
      </div>
    </>
  );
};

function RoadmapStep({ step, isToggling, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onToggle}
            disabled={isToggling}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed ${
              step.isDone
                ? "border-green-500 bg-green-500 text-white"
                : "border-gray-300 bg-white text-transparent hover:border-cyan-500 dark:border-gray-600 dark:bg-gray-900"
            }`}
            aria-label={step.isDone ? "Mark as not done" : "Mark as done"}
          >
            {isToggling ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <FiCheck className="h-4 w-4" />
            )}
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLES[step.severity] || SEVERITY_STYLES.info}`}>
                {step.severity}
              </span>

              {step.isDone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <FiCheckCircle />
                  Completed {formatRelative(step.completedAt)}
                </span>
              )}
            </div>

            <h3 className={`mt-2 text-base font-semibold ${step.isDone ? "text-gray-400 line-through" : "text-gray-800 dark:text-white"}`}>
              {step.title}
            </h3>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-green-500">+{step.estimatedScoreGain} score</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-600 hover:text-cyan-700"
      >
        <FiInfo />
        {expanded ? "Hide details" : "Why & how"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Why</h4>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{step.why}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">How</h4>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{step.how}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Roadmap;
