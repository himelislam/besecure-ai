import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { getVulnerabilities } from "../../services/vulnerabilityService";
import { sortBySeverity, SEVERITY_LABELS } from "../../lib/vulnerabilityRules";
import { getApiError } from "../../lib/apiResponse";

const MAX_SHOWN = 5;

const severityStyles = {
  critical: "bg-red-50 text-red-600",
  high: "bg-orange-50 text-orange-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-blue-50 text-blue-600",
  info: "bg-gray-100 text-gray-500",
};

// `websites` comes from the dashboard summary's `websitesSummary` (already
// fetched by Home.jsx) — vulnerabilities only carry a raw websiteId, never a
// populated website, so this is needed purely for the name lookup below.
export default function CriticalVulnerabilities({ websites = [] }) {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    // The dashboard summary endpoint only returns vulnerability *counts*,
    // not the items themselves — this is the cheapest real fetch that gets
    // the actual list. limit:50 (the API's max) rather than 5, because the
    // server sorts `severity` alphabetically (critical, high, info, low,
    // medium) not by real rank — a small server-side limit could silently
    // drop real highs/mediums in favor of infos before the client-side
    // re-sort ever sees them.
    getVulnerabilities({ status: "open", sortBy: "severity", limit: 50 })
      .then((data) => {
        setVulnerabilities(sortBySeverity(data.vulnerabilities).slice(0, MAX_SHOWN));
        setTotal(data.total);
      })
      .catch((err) => setLoadError(getApiError(err).message))
      .finally(() => setIsLoading(false));
  }, []);

  const websiteById = new Map(websites.map((w) => [w._id, w]));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vulnerabilities Requiring Attention
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Security issues that should be reviewed.
          </p>
        </div>

        {!isLoading && !loadError && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
            {total} Open
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-5 flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
        </div>
      )}

      {!isLoading && loadError && (
        <p className="mt-5 text-sm text-red-500">{loadError}</p>
      )}

      {!isLoading && !loadError && vulnerabilities.length === 0 && (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
          <FiCheckCircle className="text-2xl text-emerald-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All clear</p>
          <p className="text-xs text-gray-400">No open vulnerabilities across your websites.</p>
        </div>
      )}

      {!isLoading && !loadError && vulnerabilities.length > 0 && (
        <div className="mt-5 space-y-3">
          {vulnerabilities.map((item) => {
            const website = websiteById.get(item.websiteId);

            return (
              <Link
                key={item._id}
                to={`/scans/${item.scanId}/vulnerabilities/${item._id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/[0.05]">
                  <FiAlertTriangle className="h-5 w-5 text-gray-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                    {item.title}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {website?.nickname || website?.domain || "—"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[item.severity] || severityStyles.info}`}
                >
                  {SEVERITY_LABELS[item.severity] || item.severity}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        to="/vulnerabilities"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
      >
        View all vulnerabilities
        <FiArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
