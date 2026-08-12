import {
  FiActivity,
  FiAlertTriangle,
  FiGlobe,
  FiShield,
} from "react-icons/fi";

// No historical-comparison data exists in GET /api/dashboard/summary (it's a
// single point-in-time snapshot), so the trend badges ("+8.4% vs last
// month") the mock version had are gone — there's nothing real to back them.
export default function SecurityMetrics({ summary }) {
  const metrics = [
    {
      title: "Security Score",
      value: summary.averageScore == null ? "—" : String(summary.averageScore),
      suffix: summary.averageScore == null ? "" : "/100",
      description: summary.averageScore == null ? "No completed scans yet" : "Average across websites",
      icon: FiShield,
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
    {
      title: "Protected Websites",
      value: String(summary.totalWebsites),
      suffix: "",
      description: "Active security assets",
      icon: FiGlobe,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Open Vulnerabilities",
      value: String(summary.openVulnerabilities),
      suffix: "",
      description: "Issues requiring attention",
      icon: FiAlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Total Scans",
      value: String(summary.totalScans),
      suffix: "",
      description: "Security assessments",
      icon: FiActivity,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${metric.iconColor}`} />
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {metric.title}
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </h4>

                {metric.suffix && (
                  <span className="text-sm font-medium text-gray-400">
                    {metric.suffix}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-gray-400">
                {metric.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
