import { useMemo } from "react";
import { FiCheckCircle, FiClock, FiDownload, FiFileText, FiXCircle } from "react-icons/fi";

function formatFileSize(bytes) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <FiCheckCircle /> Completed
      </span>
    );
  }

  if (status === "generating") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
        <FiClock className="animate-pulse" /> Generating
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
      <FiXCircle /> Failed
    </span>
  );
}

// websiteId on a report is a raw ObjectId, never populated by the API —
// resolved client-side from the websites list, same pattern used for
// vulnerabilities in Phase 4.
export default function ReportTable({ reports, websites, total, page, pages, isLoading, onPageChange }) {
  const websiteById = useMemo(() => {
    const map = new Map();
    websites.forEach((w) => map.set(w._id, w));
    return map;
  }, [websites]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800 sm:px-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Generated Reports
        </h2>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and download your PDF security reports.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
        </div>
      )}

      {!isLoading && reports.length === 0 && (
        <div className="py-16 text-center text-sm text-gray-500">No reports match these filters.</div>
      )}

      {!isLoading && reports.length > 0 && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">Report</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">Website</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">File Size</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reports.map((report) => {
                const website = websiteById.get(report.websiteId);

                return (
                  <tr key={report._id} className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                          <FiFileText />
                        </div>

                        <p className="text-xs text-gray-400">
                          {report._id.slice(-8)}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {website?.nickname || website?.domain || "—"}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(report.fileSizeBytes)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(report.generatedAt || report.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {report.status === "completed" && report.cloudinaryUrl && (
                          <a
                            href={report.cloudinaryUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Download report"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
                          >
                            <FiDownload />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <p className="text-sm text-gray-500">
            Page <span className="font-medium text-gray-800 dark:text-white">{page}</span> of{" "}
            <span className="font-medium text-gray-800 dark:text-white">{pages}</span> —{" "}
            <span className="font-medium text-gray-800 dark:text-white">{total}</span> reports
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-white/5"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
