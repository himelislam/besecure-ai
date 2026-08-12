import { FiArrowUpRight, FiCheckCircle, FiClock } from "react-icons/fi";
import { Link } from "react-router";

const getScoreStyle = (score) => {
  if (score == null) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  if (score >= 80) return "bg-emerald-50 text-emerald-600";
  if (score >= 60) return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
};

// recentScans[] is capped at 5 by the backend and only ever contains
// completed scans — there's no per-scan finding count in this payload (that
// requires GET /api/scans/:id/findings, out of scope for a summary widget),
// so the old fake "Vulnerabilities" column is gone; grade replaces it since
// that's real data already on hand.
export default function RecentScans({ scans }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Security Scans
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Latest completed security assessments for your websites.
          </p>
        </div>

        <Link
          to="/scan-history"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View all
          <FiArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {scans.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FiClock className="text-2xl text-gray-300" />
          <p className="text-sm text-gray-500">No completed scans yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Website
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Score
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Type
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Date
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {scans.map((scan) => (
                <tr
                  key={scan._id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/websites/${scan.websiteId._id}`}
                      className="font-medium text-gray-800 hover:text-cyan-600 dark:text-white"
                    >
                      {scan.websiteId.nickname}
                    </Link>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${getScoreStyle(scan.score)}`}>
                      {scan.score != null ? `${scan.score}/100` : "—"}
                      {scan.grade ? ` (${scan.grade})` : ""}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                      {scan.type}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FiClock className="h-4 w-4" />
                      {new Date(scan.completedAt || scan.createdAt).toLocaleString()}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                      <FiCheckCircle className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
