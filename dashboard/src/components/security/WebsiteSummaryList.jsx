import { Link } from "react-router";
import { FiAlertTriangle, FiChevronRight, FiGlobe } from "react-icons/fi";

function scoreStyle(score) {
  if (score == null) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  if (score >= 80) return "bg-emerald-50 text-emerald-600";
  if (score >= 60) return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
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

// Wired to GET /api/dashboard/summary's websitesSummary[] — no dedicated
// per-site dashboard component existed before this.
export default function WebsiteSummaryList({ websites }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Websites
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Latest security score per website.
          </p>
        </div>

        <Link
          to="/websites"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View all
          <FiChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {websites.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
          <FiGlobe className="text-2xl text-gray-300" />
          <p className="text-sm text-gray-500">No websites yet.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {websites.map((site) => (
            <Link
              key={site._id}
              to={`/websites/${site._id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 dark:bg-white/[0.05]">
                <FiGlobe className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                  {site.nickname}
                </p>

                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {site.domain} · {formatRelativeTime(site.lastScanAt)}
                </p>
              </div>

              {site.openVulnCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  <FiAlertTriangle className="h-3 w-3" />
                  {site.openVulnCount}
                </span>
              )}

              <span
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${scoreStyle(site.lastScore)}`}
              >
                {site.lastScore != null ? `${site.lastScore}/100` : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
