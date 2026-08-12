import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";

const stats = [
  {
    title: "Total Scans",
    value: "128",
    description: "All security scans",
    icon: FiActivity,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    title: "Completed",
    value: "116",
    description: "Successfully completed",
    icon: FiCheckCircle,
    iconClass: "bg-green-50 text-green-600",
  },
  {
    title: "In Progress",
    value: "8",
    description: "Currently running",
    icon: FiClock,
    iconClass: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Failed",
    value: "4",
    description: "Require attention",
    icon: FiXCircle,
    iconClass: "bg-red-50 text-red-600",
  },
];

export default function ScanHistoryStats() {
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