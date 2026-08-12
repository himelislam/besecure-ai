import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiGlobe,
  FiShield,
  FiClock,
  FiTarget,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import SecurityScoreChart from "../../components/security/SecurityScoreChart";
import RiskDistribution from "../../components/security/RiskDistribution";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";

function statusForScore(score) {
  if (score == null) return { label: "Not Scanned", style: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
  if (score >= 90) return { label: "Excellent", style: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" };
  if (score >= 70) return { label: "Good", style: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400" };
  if (score >= 60) return { label: "Needs Attention", style: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400" };
  return { label: "At Risk", style: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" };
}

function scoreBarColor(score) {
  if (score == null) return "bg-gray-300";
  if (score >= 90) return "bg-green-500";
  if (score >= 70) return "bg-cyan-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
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

const SecurityAnalytics = () => {
  const { data, isLoading, error, refetch } = useDashboardSummary();

  const websites = data?.websitesSummary || [];
  const scoredWebsites = websites.filter((w) => w.lastScore != null);
  const secureCount = scoredWebsites.filter((w) => w.lastScore >= 80).length;
  const attentionCount = scoredWebsites.filter((w) => w.lastScore >= 60 && w.lastScore < 80).length;
  const atRiskCount = scoredWebsites.filter((w) => w.lastScore < 60).length;
  const lastScanAt = websites.reduce((latest, w) => {
    if (!w.lastScanAt) return latest;
    return !latest || new Date(w.lastScanAt) > new Date(latest) ? w.lastScanAt : latest;
  }, null);

  return (
    <>
      <PageMeta
        title="Security Analytics | SecureSphere"
        description="Security analytics and vulnerability insights"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Security Analytics
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your security posture and track vulnerability trends.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center dark:border-red-500/20 dark:bg-red-500/5">
            <FiAlertTriangle className="text-3xl text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                  <FiShield className="h-5 w-5 text-cyan-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                  Average Security Score
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {data.averageScore ?? "—"}<span className="text-sm font-medium text-gray-400">/100</span>
                </h3>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                  <FiGlobe className="h-5 w-5 text-blue-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                  Protected Websites
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {data.totalWebsites}
                </h3>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                  <FiAlertTriangle className="h-5 w-5 text-red-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                  Open Vulnerabilities
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {data.openVulnerabilities}
                </h3>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
                  <FiActivity className="h-5 w-5 text-purple-500" />
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                  Total Scans
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {data.totalScans}
                </h3>
              </div>
            </div>

            {/* SCORE TREND + OVERVIEW */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-8">
                <SecurityScoreChart scoreHistory={data.scoreHistory} />
              </div>

              <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Security Overview
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Current platform security status.
                </p>

                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Secure Websites
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-white">{secureCount}</span>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiAlertTriangle className="text-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Needs Attention
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-white">{attentionCount}</span>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiAlertTriangle className="text-red-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        At Risk
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-white">{atRiskCount}</span>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiClock className="text-cyan-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Last Scan
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {formatRelativeTime(lastScanAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-7 rounded-xl bg-cyan-50 p-4 dark:bg-cyan-500/10">
                  <div className="flex gap-3">
                    <FiTarget className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
                    <div>
                      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                        Security goal
                      </p>
                      <p className="mt-1 text-xs leading-5 text-cyan-600 dark:text-cyan-400/80">
                        Increase your average security score above 90.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CURRENT VULNERABILITY BREAKDOWN */}
            <RiskDistribution riskDistribution={data.riskDistribution} />

            {/* WEBSITE SECURITY PERFORMANCE */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Website Security Performance
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Compare security performance across your websites.
                </p>
              </div>

              {websites.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No websites yet — add one to start tracking security performance.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Website</th>
                        <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Security Score</th>
                        <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Open Vulnerabilities</th>
                        <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Scan</th>
                        <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {websites.map((website) => {
                        const status = statusForScore(website.lastScore);

                        return (
                          <tr key={website._id} className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-500/10">
                                  <FiGlobe className="text-cyan-500" />
                                </div>
                                <span className="font-medium text-gray-800 dark:text-white/90">
                                  {website.nickname || website.domain}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {website.lastScore != null ? (
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                      className={`h-full rounded-full ${scoreBarColor(website.lastScore)}`}
                                      style={{ width: `${website.lastScore}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {website.lastScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  website.openVulnCount <= 3
                                    ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                    : website.openVulnCount <= 10
                                      ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
                                      : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                }`}
                              >
                                {website.openVulnCount} issues
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(website.lastScanAt)}
                            </td>

                            <td className="px-6 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.style}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SecurityAnalytics;
