import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiGlobe,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiXCircle,
  FiChevronDown,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { useAllScans } from "../../hooks/useAllScans";
import { createScan } from "../../services/scanService";
import { getApiError } from "../../lib/apiResponse";
import { SCAN_STATUS_LABELS } from "../../lib/scanRules";

const statusStyles = {
  completed: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  running: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  queued: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

const scoreColor = (score) => {
  if (score >= 90) return "text-green-500";
  if (score >= 70) return "text-cyan-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
};

const formatDuration = (durationMs) => {
  if (durationMs == null) return "—";
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const Scans = () => {
  const { websites, scans, isLoading, error, refetch } = useAllScans();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [websiteFilter, setWebsiteFilter] = useState("All");
  const [retryingWebsiteId, setRetryingWebsiteId] = useState(null);
  const [retryError, setRetryError] = useState("");

  const websiteById = useMemo(() => {
    const map = new Map();
    websites.forEach((w) => map.set(w._id, w));
    return map;
  }, [websites]);

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      const website = websiteById.get(scan.websiteId);
      const label = website?.nickname || website?.domain || "";

      const matchesSearch =
        label.toLowerCase().includes(search.toLowerCase()) ||
        scan.targetUrl?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || scan.status === statusFilter;
      const matchesWebsite = websiteFilter === "All" || scan.websiteId === websiteFilter;

      return matchesSearch && matchesStatus && matchesWebsite;
    });
  }, [scans, search, statusFilter, websiteFilter, websiteById]);

  const completedScans = scans.filter((s) => s.status === "completed").length;

  const totalVulnerabilities = scans.reduce((total, scan) => {
    const counts = scan.findingCounts || {};
    return total + Object.values(counts).reduce((sum, v) => sum + v, 0);
  }, 0);

  const criticalIssues = scans.reduce((total, scan) => total + (scan.findingCounts?.critical || 0), 0);

  const handleRetry = async (websiteId) => {
    setRetryError("");
    setRetryingWebsiteId(websiteId);

    try {
      await createScan({ websiteId, type: "baseline" });
      await refetch();
    } catch (err) {
      setRetryError(getApiError(err).message);
    } finally {
      setRetryingWebsiteId(null);
    }
  };

  return (
    <>
      <PageMeta
        title="Security Scans | SecureSphere"
        description="Manage and monitor website security scans"
      />

      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Security Scans
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Run security scans and monitor your website protection.
            </p>
          </div>

          <Link
            to="/websites"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
          >
            <FiPlus />
            New Security Scan
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
              <FiActivity className="h-5 w-5 text-cyan-500" />
            </div>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Total Scans</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{scans.length}</h3>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
              <FiCheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{completedScans}</h3>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
              <FiAlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Vulnerabilities Found</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{totalVulnerabilities}</h3>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
              <FiShield className="h-5 w-5 text-purple-500" />
            </div>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Critical Issues</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{criticalIssues}</h3>
          </div>
        </div>

        {/* QUICK SCAN */}
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white">
                <FiShield className="h-6 w-6" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Run a security scan
                </h2>

                <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                  Pick one of your websites to scan for security headers,
                  SSL/TLS issues, and (on verified domains) active
                  vulnerabilities.
                </p>
              </div>
            </div>

            <Link
              to="/websites"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
            >
              <FiPlay />
              Start Scan
            </Link>
          </div>
        </div>

        {/* FILTERS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scans..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <select
                  value={websiteFilter}
                  onChange={(e) => setWebsiteFilter(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-700 outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:w-52"
                >
                  <option value="All">All Websites</option>
                  {websites.map((website) => (
                    <option key={website._id} value={website._id}>
                      {website.nickname}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-700 outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:w-44"
                >
                  <option value="All">All Status</option>
                  {Object.entries(SCAN_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {retryError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{retryError}</div>
        )}

        {/* SCANS TABLE */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Scan History</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and manage your recent security scans.</p>
              </div>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredScans.length} scan{filteredScans.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
            </div>
          )}

          {!isLoading && error && (
            <div className="px-6 py-16 text-center text-sm text-red-500">{error}</div>
          )}

          {!isLoading && !error && filteredScans.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <FiSearch className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-800 dark:text-white">No scans found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {scans.length === 0 ? "Run your first scan from a website's page." : "Try changing your search or filters."}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredScans.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Website</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Security Score</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vulnerabilities</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredScans.map((scan) => {
                    const website = websiteById.get(scan.websiteId);
                    const counts = scan.findingCounts || {};
                    const totalFindings = Object.values(counts).reduce((sum, v) => sum + v, 0);

                    return (
                      <tr key={scan._id} className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                              <FiGlobe className="text-cyan-500" />
                            </div>

                            <div>
                              <p className="font-medium text-gray-800 dark:text-white/90">
                                {website?.nickname || "Unknown website"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">{scan.type}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[scan.status]}`}>
                            {scan.status === "completed" && <FiCheckCircle />}
                            {scan.status === "failed" && <FiXCircle />}
                            {scan.status === "running" && <FiRefreshCw className="animate-spin" />}
                            {SCAN_STATUS_LABELS[scan.status]}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {scan.score == null ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                  className={`h-full rounded-full ${
                                    scan.score >= 90 ? "bg-green-500" : scan.score >= 70 ? "bg-cyan-500" : scan.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${scan.score}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${scoreColor(scan.score)}`}>{scan.score}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {scan.status !== "completed" ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {counts.critical > 0 && (
                                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                  {counts.critical} C
                                </span>
                              )}
                              {counts.high > 0 && (
                                <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                                  {counts.high} H
                                </span>
                              )}
                              {counts.medium > 0 && (
                                <span className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
                                  {counts.medium} M
                                </span>
                              )}
                              {counts.low > 0 && (
                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  {counts.low} L
                                </span>
                              )}
                              {totalFindings === 0 && <span className="text-xs text-green-500">No issues</span>}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <FiClock className="h-4 w-4" />
                            {formatDuration(scan.durationMs)}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(scan.createdAt).toLocaleString()}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            {(scan.status === "completed" || scan.status === "running" || scan.status === "queued") && (
                              <Link
                                to={`/websites/${scan.websiteId}/scan/results?scanId=${scan._id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-cyan-500 hover:text-cyan-500 dark:border-gray-700 dark:text-gray-300"
                              >
                                <FiEye />
                                Results
                              </Link>
                            )}

                            {scan.status === "failed" && (
                              <button
                                type="button"
                                onClick={() => handleRetry(scan.websiteId)}
                                disabled={retryingWebsiteId === scan.websiteId}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-cyan-500 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                              >
                                <FiRefreshCw className={retryingWebsiteId === scan.websiteId ? "animate-spin" : ""} />
                                Scan Again
                              </button>
                            )}

                            <Link
                              to={`/websites/${scan.websiteId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              Website
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SCAN LEGEND */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Critical</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Immediate action required</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">High</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fix as soon as possible</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Medium</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review and prioritize</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="h-3 w-3 rounded-full bg-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Low</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Low-risk security issue</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Scans;
