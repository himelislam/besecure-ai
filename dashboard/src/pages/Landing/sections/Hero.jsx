import { Link } from "react-router";
import {
  FiArrowRight,
  FiCheckCircle,
  FiShield,
  FiAlertTriangle,
  FiLock,
  FiCode,
  FiServer,
} from "react-icons/fi";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-950">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="absolute -left-40 top-40 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="absolute -right-40 bottom-0 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                <FiShield className="text-xs" />
              </span>

              AI-Powered Website Security
            </div>

            {/* Heading */}
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              Secure Your Website
              <span className="block text-brand-500">
                Before Attackers Do.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8 dark:text-gray-400">
              SecureSphere helps you discover website vulnerabilities,
              understand security risks, and improve your security posture
              with AI-powered guidance.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600"
              >
                Start Free Security Scan
                <FiArrowRight />
              </Link>

              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
              >
                Explore Features
              </a>
            </div>

            {/* Benefits */}
            <div className="mt-8 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-green-500" />
                AI-powered recommendations
              </div>

              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-green-500" />
                OWASP-based analysis
              </div>

              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-green-500" />
                Easy to understand
              </div>
            </div>
          </div>

          {/* Right - Security Dashboard Preview */}
          <div className="relative">
            {/* Glow */}
            <div className="absolute inset-10 rounded-full bg-brand-500/10 blur-3xl" />

            <div className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30">
              {/* Browser bar */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>

                <div className="rounded-md bg-white px-4 py-1.5 text-[10px] text-gray-400 shadow-sm dark:bg-gray-900">
                  app.securesphere.local
                </div>

                <div className="w-10" />
              </div>

              {/* Dashboard */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Website Security</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
                      example.com
                    </h3>
                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-500/10">
                    Healthy
                  </span>
                </div>

                {/* Score */}
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">
                        Security Score
                      </p>

                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          92
                        </span>

                        <span className="mb-1 text-xs text-gray-500">
                          /100
                        </span>
                      </div>
                    </div>

                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-green-500 bg-white text-lg font-bold text-green-600 dark:bg-gray-900">
                      A
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full w-[92%] rounded-full bg-green-500" />
                  </div>
                </div>

                {/* Security checks */}
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                      Security Health
                    </h4>

                    <span className="text-[10px] text-gray-400">
                      Latest scan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SecurityCheck
                      icon={FiLock}
                      title="SSL / HTTPS"
                      status="Passed"
                      type="success"
                    />

                    <SecurityCheck
                      icon={FiShield}
                      title="Headers"
                      status="Warning"
                      type="warning"
                    />

                    <SecurityCheck
                      icon={FiCode}
                      title="XSS"
                      status="Passed"
                      type="success"
                    />

                    <SecurityCheck
                      icon={FiServer}
                      title="SQL Injection"
                      status="Passed"
                      type="success"
                    />
                  </div>
                </div>

                {/* Finding */}
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3 dark:border-orange-500/20 dark:bg-orange-500/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500 dark:bg-orange-500/10">
                    <FiAlertTriangle />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-800 dark:text-white">
                      Missing Security Header
                    </p>

                    <p className="mt-0.5 text-[10px] text-gray-500">
                      Medium severity · AI recommendation available
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:block dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-500/10">
                  <FiCheckCircle />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">
                    Security Scan Complete
                  </p>

                  <p className="text-[10px] text-gray-500">
                    17 checks completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityCheck({ icon: Icon, title, status, type }) {
  const success = type === "success";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md ${
          success
            ? "bg-green-50 text-green-600 dark:bg-green-500/10"
            : "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10"
        }`}
      >
        <Icon className="text-sm" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-gray-700 dark:text-gray-300">
          {title}
        </p>

        <p
          className={`text-[9px] font-medium ${
            success ? "text-green-600" : "text-yellow-600"
          }`}
        >
          {status}
        </p>
      </div>
    </div>
  );
}