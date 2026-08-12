import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  FiArrowLeft,
  FiGlobe,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiChevronRight,
  FiExternalLink,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiLayers,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import VerificationInstructions from "../../components/websites/VerificationInstructions";
import {
  getWebsite,
  getWebsiteVerification,
  updateWebsite,
  deleteWebsite,
} from "../../services/websiteService";
import { getWebsiteScans, getScanFindings } from "../../services/scanService";
import { getApiError } from "../../lib/apiResponse";
import { sortBySeverity } from "../../lib/vulnerabilityRules";

const FINDINGS_LIMIT = 50; // API max — matches ScanResults.jsx's own cap
const RECENT_FINDINGS_SHOWN = 4;

const severityStyles = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
  info: "bg-gray-100 text-gray-600",
};

function scoreLevel(score) {
  if (score == null) return { label: "—", color: "text-gray-400", bar: "bg-gray-300" };
  if (score >= 80) return { label: "Low", color: "text-green-600", bar: "bg-green-500", chip: "bg-green-100 text-green-700" };
  if (score >= 60) return { label: "Medium", color: "text-yellow-600", bar: "bg-yellow-500", chip: "bg-yellow-100 text-yellow-700" };
  return { label: "High", color: "text-red-600", bar: "bg-red-500", chip: "bg-red-100 text-red-700" };
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Never scanned";

  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function WebsiteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [website, setWebsite] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [verification, setVerification] = useState(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);

  const renameModal = useModal();
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const deleteModal = useModal();
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [latestScan, setLatestScan] = useState(null);
  const [isLoadingScan, setIsLoadingScan] = useState(true);
  const [findings, setFindings] = useState([]);
  const [findingsTotal, setFindingsTotal] = useState(0);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError("");

    getWebsite(id)
      .then(({ website: fetched }) => {
        if (cancelled) return;
        setWebsite(fetched);

        if (!fetched.verified) {
          setIsLoadingVerification(true);
          getWebsiteVerification(id)
            .then((instructions) => {
              if (!cancelled) setVerification(instructions);
            })
            .finally(() => {
              if (!cancelled) setIsLoadingVerification(false);
            });
        }
      })
      .catch((err) => {
        // 404 covers "doesn't exist", "soft-deleted", and "belongs to
        // someone else" identically — there's no way to tell them apart,
        // so this message doesn't try to.
        if (!cancelled) setLoadError(getApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Sorted newest-first server-side — limit:1 is the most recent scan
    // regardless of status (queued/running/completed/failed).
    setIsLoadingScan(true);
    getWebsiteScans(id, { page: 1, limit: 1 })
      .then((data) => {
        if (cancelled) return;
        const scan = data.scans[0] || null;
        setLatestScan(scan);

        if (scan && scan.status === "completed") {
          setIsLoadingFindings(true);
          getScanFindings(scan._id, { page: 1, limit: FINDINGS_LIMIT })
            .then((findingsData) => {
              if (cancelled) return;
              setFindings(sortBySeverity(findingsData.vulnerabilities));
              setFindingsTotal(findingsData.total);
            })
            .finally(() => {
              if (!cancelled) setIsLoadingFindings(false);
            });
        }
      })
      .catch(() => {
        // Non-critical — the stats grid just falls back to an empty state.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingScan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const openRename = () => {
    setRenameValue(website.nickname);
    setRenameError("");
    renameModal.openModal();
  };

  const handleRename = async (e) => {
    e.preventDefault();

    if (!renameValue.trim()) {
      setRenameError("Name can't be empty.");
      return;
    }

    setRenameError("");
    setIsRenaming(true);

    try {
      const { website: updated } = await updateWebsite(id, {
        nickname: renameValue.trim(),
      });

      setWebsite(updated);
      renameModal.closeModal();
    } catch (err) {
      setRenameError(getApiError(err).message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteWebsite(id);
      navigate("/websites", { replace: true });
    } catch (err) {
      setDeleteError(getApiError(err).message);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <FiAlertTriangle className="text-3xl text-red-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300">{loadError}</p>
        <Link
          to="/websites"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to Websites
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${website.nickname} | BeSecure AI`}
        description="Website security overview"
      />

      <div className="space-y-6">
        {/* ================= HEADER ================= */}
        <div>
          <Link
            to="/websites"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-brand-500"
          >
            <FiArrowLeft />
            Back to Websites
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <FiGlobe className="text-2xl" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                    {website.nickname}
                  </h1>

                  {website.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      <FiCheckCircle /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                      Pending Verification
                    </span>
                  )}
                </div>

                <a
                  href={website.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500"
                >
                  {website.url}
                  <FiExternalLink className="text-xs" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/websites/${id}/scan`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <FiShield />
                Start Security Scan
              </Link>

              <button
                onClick={openRename}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FiEdit2 />
                Rename
              </button>

              <button
                onClick={deleteModal.openModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-white/[0.03] dark:hover:bg-red-500/10"
              >
                <FiTrash2 />
                Remove
              </button>
            </div>
          </div>
        </div>

        {/* ================= DOMAIN VERIFICATION ================= */}
        {!website.verified && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Domain Verification
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Verify you own {website.domain} to unlock deep scans. Baseline
                scans work without verification.
              </p>
            </div>

            {isLoadingVerification && (
              <div className="flex items-center justify-center py-8">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
              </div>
            )}

            {!isLoadingVerification && verification && (
              <VerificationInstructions
                websiteId={id}
                instructions={verification}
                onVerified={() => setWebsite((prev) => ({ ...prev, verified: true }))}
              />
            )}
          </div>
        )}

        {/* ================= TOP STATS ================= */}
        {isLoadingScan ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
          </div>
        ) : !latestScan ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
            <FiShield className="text-3xl text-gray-300" />
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white/90">No scans yet</h3>
              <p className="mt-1 text-sm text-gray-500">Run a scan to see this website's security stats here.</p>
            </div>
            <Link
              to={`/websites/${id}/scan`}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <FiShield />
              Start Security Scan
            </Link>
          </div>
        ) : latestScan.status !== "completed" ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-12 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <FiClock className="text-3xl text-gray-300" />
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white/90">
                {latestScan.status === "failed" ? "Last scan failed" : "Scan in progress"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {latestScan.status === "failed"
                  ? "The most recent scan didn't complete — try running another one."
                  : "Stats will appear here once the current scan finishes."}
              </p>
            </div>
            <Link
              to={`/websites/${id}/scan/results?scanId=${latestScan._id}`}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View scan
              <FiChevronRight />
            </Link>
          </div>
        ) : (
          <>
            {(() => {
              const level = scoreLevel(latestScan.score);
              const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
              findings.forEach((f) => {
                if (severityCounts[f.severity] != null) severityCounts[f.severity] += 1;
              });

              const categoryCounts = new Map();
              findings.forEach((f) => {
                categoryCounts.set(f.category, (categoryCounts.get(f.category) || 0) + 1);
              });
              const topCategories = [...categoryCounts.entries()].sort(([, a], [, b]) => b - a);

              return (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {/* Security Score */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Security Score</span>

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                          <FiShield />
                        </div>
                      </div>

                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white/90">
                          {latestScan.score ?? "—"}
                        </span>

                        <span className="mb-1 text-sm text-gray-500">/100</span>

                        <span className={`mb-1 ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${level.chip}`}>
                          Grade {latestScan.grade ?? "—"}
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full ${level.bar}`}
                          style={{ width: `${latestScan.score ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Risk Level */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Risk Level</span>

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                          <FiAlertTriangle />
                        </div>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90">
                        {level.label}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Based on latest security score
                      </p>
                    </div>

                    {/* Last Scan */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Last Scan</span>

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <FiClock />
                        </div>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90">
                        {formatRelativeTime(latestScan.completedAt || latestScan.createdAt)}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500 capitalize">
                        {latestScan.type || "baseline"} scan
                      </p>
                    </div>

                    {/* Total Vulnerabilities */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Total Vulnerabilities
                        </span>

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <FiAlertTriangle />
                        </div>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90">
                        {isLoadingFindings ? "—" : findingsTotal}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Across all severity levels
                      </p>
                    </div>
                  </div>

                  {/* ================= VULNERABILITY SUMMARY ================= */}
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                          Vulnerability Summary
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Security issues found during the latest scan.
                        </p>
                      </div>

                      {isLoadingFindings ? (
                        <div className="flex justify-center py-8">
                          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {[
                            { key: "critical", label: "Critical", color: "bg-red-500" },
                            { key: "high", label: "High", color: "bg-orange-500" },
                            { key: "medium", label: "Medium", color: "bg-yellow-500" },
                            { key: "low", label: "Low", color: "bg-blue-500" },
                            { key: "info", label: "Info", color: "bg-gray-400" },
                          ].map((item) => (
                            <div key={item.key}>
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />

                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {item.label}
                                  </span>
                                </div>

                                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                  {severityCounts[item.key]}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                  className={`h-full rounded-full ${item.color}`}
                                  style={{
                                    width: `${findingsTotal > 0 ? Math.max((severityCounts[item.key] / findingsTotal) * 100, severityCounts[item.key] > 0 ? 8 : 0) : 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Findings by Category */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-2">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                          Findings by Category
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          What kinds of issues the latest scan found.
                        </p>
                      </div>

                      {isLoadingFindings ? (
                        <div className="flex justify-center py-8">
                          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                        </div>
                      ) : topCategories.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <FiCheckCircle className="text-2xl text-emerald-500" />
                          <p className="text-sm text-gray-500">No findings in the latest scan.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {topCategories.map(([category, count]) => (
                            <div
                              key={category}
                              className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500 dark:bg-white/5">
                                  <FiLayers />
                                </div>

                                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
                                  {category}
                                </h3>
                              </div>

                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                                {count} finding{count === 1 ? "" : "s"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* ================= RECENT FINDINGS ================= */}
        {latestScan && latestScan.status === "completed" && (
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Recent Security Findings
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Highest-severity issues from the latest scan.
                </p>
              </div>

              <Link
                to="/vulnerabilities"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
              >
                View all findings
                <FiChevronRight />
              </Link>
            </div>

            {isLoadingFindings ? (
              <div className="flex justify-center py-10">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
              </div>
            ) : findings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <FiCheckCircle className="text-2xl text-emerald-500" />
                <p className="text-sm text-gray-500">No findings in the latest scan.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {findings.slice(0, RECENT_FINDINGS_SHOWN).map((finding) => (
                  <div
                    key={finding._id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 dark:hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                        <FiAlertTriangle />
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-white/90">
                          {finding.title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {finding.recommendation}
                        </p>

                        <span className="mt-2 inline-block text-xs text-gray-400">
                          {finding.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[finding.severity] || severityStyles.info}`}
                      >
                        {finding.severity}
                      </span>

                      <Link
                        to={`/scans/${latestScan._id}/vulnerabilities/${finding._id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                      >
                        <FiChevronRight />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= QUICK ACTIONS ================= */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Continue improving your website security.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              to={`/websites/${id}/scan`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:hover:bg-brand-500/5"
            >
              <FiShield className="text-brand-500" />

              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Run Security Scan
                </p>

                <p className="text-xs text-gray-500">Check your website</p>
              </div>
            </Link>

            <Link
              to="/vulnerabilities"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:hover:bg-brand-500/5"
            >
              <FiAlertTriangle className="text-orange-500" />

              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Review Vulnerabilities
                </p>

                <p className="text-xs text-gray-500">Fix security issues</p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:hover:bg-brand-500/5"
            >
              <FiFileText className="text-blue-500" />

              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Security Reports
                </p>

                <p className="text-xs text-gray-500">View scan reports</p>
              </div>
            </Link>

            <Link
              to="/scan-history"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:hover:bg-brand-500/5"
            >
              <FiClock className="text-purple-500" />

              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Scan History
                </p>

                <p className="text-xs text-gray-500">Track improvements</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal isOpen={renameModal.isOpen} onClose={renameModal.closeModal} className="max-w-md m-4">
        <form onSubmit={handleRename} className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Rename website
          </h3>

          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Only the display name changes — {website.domain} stays the same.
            To change the URL, delete and re-add the site.
          </p>

          {renameError && (
            <p className="mb-4 text-sm text-red-500">{renameError}</p>
          )}

          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            autoFocus
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={renameModal.closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isRenaming}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isRenaming ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Remove {website.nickname}?
          </h3>

          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            This removes the site from your dashboard. It won't appear in
            your website list anymore.
          </p>

          {deleteError && (
            <p className="mb-4 text-sm text-red-500">{deleteError}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={deleteModal.closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
