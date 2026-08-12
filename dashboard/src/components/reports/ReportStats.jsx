import { FiFileText, FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";

// GET /api/reports has no dedicated stats endpoint (unlike vulnerabilities),
// so these are computed from the currently-loaded page — accurate as long
// as the user has 50 or fewer reports (the max page size), which covers
// the overwhelming majority of real usage. "Total" alone uses the real
// server-side `total` count across all pages.
export default function ReportStats({ reports, total }) {
  const completed = reports.filter((r) => r.status === "completed").length;
  const generating = reports.filter((r) => r.status === "generating").length;
  const failed = reports.filter((r) => r.status === "failed").length;

  const stats = [
    {
      title: "Total Reports",
      value: total,
      description: "Across all your scans",
      icon: FiFileText,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      title: "Completed",
      value: completed,
      description: "Ready to download",
      icon: FiCheckCircle,
      iconClass: "bg-green-50 text-green-600",
    },
    {
      title: "Generating",
      value: generating,
      description: "Currently processing",
      icon: FiClock,
      iconClass: "bg-yellow-50 text-yellow-600",
    },
    {
      title: "Failed",
      value: failed,
      description: "Can be retried",
      icon: FiXCircle,
      iconClass: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.title}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                  {stat.value}
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {stat.description}
                </p>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
