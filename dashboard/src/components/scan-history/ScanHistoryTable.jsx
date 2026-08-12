import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiMoreVertical,
  FiXCircle,
} from "react-icons/fi";

const scans = [
  {
    id: "SCAN-0128",
    website: "example.com",
    type: "Full Scan",
    status: "Completed",
    vulnerabilities: 8,
    critical: 1,
    high: 3,
    medium: 3,
    low: 1,
    duration: "2m 18s",
    date: "Jul 29, 2026 01:42 AM",
  },
  {
    id: "SCAN-0127",
    website: "demo-site.com",
    type: "Quick Scan",
    status: "Completed",
    vulnerabilities: 4,
    critical: 0,
    high: 2,
    medium: 1,
    low: 1,
    duration: "1m 04s",
    date: "Jul 28, 2026 11:20 PM",
  },
  {
    id: "SCAN-0126",
    website: "mywebsite.com",
    type: "Full Scan",
    status: "Running",
    vulnerabilities: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    duration: "Running",
    date: "Jul 28, 2026 09:15 PM",
  },
  {
    id: "SCAN-0125",
    website: "shopdemo.com",
    type: "XSS",
    status: "Completed",
    vulnerabilities: 6,
    critical: 1,
    high: 2,
    medium: 2,
    low: 1,
    duration: "48s",
    date: "Jul 28, 2026 05:32 PM",
  },
  {
    id: "SCAN-0124",
    website: "testsite.com",
    type: "SQL Injection",
    status: "Failed",
    vulnerabilities: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    duration: "Failed",
    date: "Jul 27, 2026 08:45 PM",
  },
  {
    id: "SCAN-0123",
    website: "secure-demo.com",
    type: "Security Headers",
    status: "Completed",
    vulnerabilities: 3,
    critical: 0,
    high: 1,
    medium: 2,
    low: 0,
    duration: "32s",
    date: "Jul 27, 2026 06:10 PM",
  },
];

function StatusBadge({ status }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <FiCheckCircle />
        Completed
      </span>
    );
  }

  if (status === "Running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
        <FiClock />
        Running
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
      <FiXCircle />
      Failed
    </span>
  );
}

export default function ScanHistoryTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Previous Scans
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review your previous website security scans.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <FiDownload />
          Export
        </button>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Scan
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Website
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Type
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Findings
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Duration
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Date
              </th>

              <th className="px-6 py-4 text-right text-xs font-medium uppercase text-gray-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {scans.map((scan) => (
              <tr
                key={scan.id}
                className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {scan.id}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {scan.website}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {scan.type}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={scan.status} />
                </td>

                <td className="px-6 py-4">
                  {scan.status === "Completed" ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-red-600">
                        {scan.critical} C
                      </span>

                      <span className="text-gray-300">•</span>

                      <span className="font-semibold text-orange-600">
                        {scan.high} H
                      </span>

                      <span className="text-gray-300">•</span>

                      <span className="font-semibold text-yellow-600">
                        {scan.medium} M
                      </span>

                      <span className="text-gray-300">•</span>

                      <span className="font-semibold text-blue-600">
                        {scan.low} L
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                <td className="px-6 py-4 text-sm text-gray-500">
                  {scan.duration}
                </td>

                <td className="px-6 py-4 text-sm text-gray-500">
                  {scan.date}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {scan.status === "Completed" && (
                      <button
                        type="button"
                        title="View scan"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        <FiEye />
                      </button>
                    )}

                    <button
                      type="button"
                      title="More options"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      <FiMoreVertical />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-800 dark:text-white">
            1–6
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-800 dark:text-white">
            128
          </span>{" "}
          scans
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
          >
            Previous
          </button>

          <button
            type="button"
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white"
          >
            1
          </button>

          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
          >
            2
          </button>

          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
          >
            3
          </button>

          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}