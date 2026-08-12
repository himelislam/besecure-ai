import {
  FiGlobe,
  FiShield,
  FiActivity,
  FiCpu,
} from "react-icons/fi";

const stats = [
  {
    icon: FiGlobe,
    value: "Website",
    label: "Security Monitoring",
  },
  {
    icon: FiShield,
    value: "OWASP",
    label: "Security-Based Analysis",
  },
  {
    icon: FiActivity,
    value: "Real-Time",
    label: "Security Insights",
  },
  {
    icon: FiCpu,
    value: "AI-Powered",
    label: "Security Guidance",
  },
];

export default function PlatformStats() {
  return (
    <section className="border-y border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-gray-200 sm:grid-cols-4 dark:divide-gray-800">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="flex items-center justify-center gap-3 px-4 py-3"
              >
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 sm:flex dark:bg-brand-500/10">
                  <Icon />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">
                    {stat.value}
                  </p>

                  <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}