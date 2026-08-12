import {
  FiGlobe,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";

const steps = [
  {
    number: "01",
    icon: FiGlobe,
    title: "Add Your Website",
    description:
      "Add a website you own or have explicit authorization to test to your SecureSphere account.",
  },
  {
    number: "02",
    icon: FiShield,
    title: "Run a Security Scan",
    description:
      "SecureSphere analyzes your website for security issues and configuration weaknesses.",
  },
  {
    number: "03",
    icon: FiAlertTriangle,
    title: "Understand the Risks",
    description:
      "Review vulnerabilities, severity levels, security scores, and AI-powered explanations.",
  },
  {
    number: "04",
    icon: FiCheckCircle,
    title: "Fix & Monitor",
    description:
      "Apply recommended fixes and use scan history to track your security improvements.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-gray-100 bg-gray-50/70 py-20 dark:border-gray-800 dark:bg-gray-900/30 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-500">
            Simple Security Workflow
          </span>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            From Website to Security Improvement
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-500 dark:text-gray-400">
            SecureSphere makes website security easier to understand and
            easier to manage.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-14">
          {/* Connector */}
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gray-200 lg:block dark:bg-gray-700" />

          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.number} className="relative text-center">
                  {/* Icon */}
                  <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <Icon className="text-xl" />
                    </div>
                  </div>

                  {/* Number */}
                  <span className="mt-4 block text-xs font-bold tracking-widest text-brand-500">
                    STEP {step.number}
                  </span>

                  <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-white">
                    {step.title}
                  </h3>

                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <a
            href="#security"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 transition hover:text-brand-600"
          >
            Explore our security checks
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}