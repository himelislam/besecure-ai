import {
  FiShield,
  FiCpu,
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiFileText,
  FiArrowRight,
} from "react-icons/fi";

const features = [
  {
    icon: FiShield,
    title: "Automated Security Scanning",
    description:
      "Analyze your website for common vulnerabilities, security misconfigurations, and weak security controls.",
  },
  {
    icon: FiCpu,
    title: "AI Security Assistant",
    description:
      "Understand technical security findings through clear AI-powered explanations and remediation guidance.",
  },
  {
    icon: FiActivity,
    title: "Security Score",
    description:
      "Get a simple security score that gives you an instant overview of your website's security posture.",
  },
  {
    icon: FiAlertTriangle,
    title: "Vulnerability Management",
    description:
      "Track security issues from discovery to remediation and keep your vulnerability workflow organized.",
  },
  {
    icon: FiClock,
    title: "Security History",
    description:
      "Compare previous scans and monitor how your website security changes over time.",
  },
  {
    icon: FiFileText,
    title: "Professional Reports",
    description:
      "Generate structured security reports containing findings, severity levels, and actionable recommendations.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-white py-20 dark:bg-gray-950 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-500">
            Powerful Security Tools
          </span>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Everything You Need to Understand Website Security
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-500 dark:text-gray-400">
            SecureSphere combines security scanning, vulnerability management,
            analytics, and AI-powered assistance into one platform.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-gray-200/40 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30 dark:hover:shadow-black/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/10">
                  <Icon className="text-xl" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-gray-800 dark:text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>

                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-brand-500 opacity-0 transition group-hover:opacity-100">
                  Learn more
                  <FiArrowRight />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}