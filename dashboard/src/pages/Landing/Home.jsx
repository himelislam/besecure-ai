import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiCpu,
  FiGlobe,
  FiLock,
  FiMenu,
  FiShield,
  FiX,
  FiZap,
} from "react-icons/fi";
import { Link } from "react-router";
import { useState } from "react";

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900 antialiased">
      {/* NAVBAR */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25 ring-1 ring-white/40">
                  <FiShield className="relative z-10 text-xl text-white" />
                </div>

                <div>
                  <div className="text-lg font-bold tracking-tight">
                    Secure<span className="text-cyan-500">Sphere</span>
                  </div>

                  <div className="hidden text-[9px] font-medium uppercase tracking-[0.25em] text-slate-400 sm:block">
                    Intelligent Security
                  </div>
                </div>
              </Link>

              <nav className="hidden items-center gap-8 lg:flex">
                <a
                  href="#features"
                  className="text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-600"
                >
                  Features
                </a>

                <a
                  href="#platform"
                  className="text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-600"
                >
                  Platform
                </a>

                <a
                  href="#pricing"
                  className="text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-600"
                >
                  Pricing
                </a>

                <Link
                  to="/signin"
                  className="text-sm font-medium text-slate-700 transition-colors duration-200 hover:text-cyan-600"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                >
                  Get Started
                </Link>
              </nav>

              <button
                onClick={() => setMobileMenu(!mobileMenu)}
                className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenu ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
            </div>

            {mobileMenu && (
              <div className="border-t border-slate-100 py-4 lg:hidden">
                <div className="flex flex-col gap-1">
                  <a
                    href="#features"
                    onClick={() => setMobileMenu(false)}
                    className="rounded-lg px-3 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Features
                  </a>

                  <a
                    href="#platform"
                    onClick={() => setMobileMenu(false)}
                    className="rounded-lg px-3 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Platform
                  </a>

                  <a
                    href="#pricing"
                    onClick={() => setMobileMenu(false)}
                    className="rounded-lg px-3 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Pricing
                  </a>

                  <Link
                    to="/signin"
                    className="rounded-lg px-3 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Sign In
                  </Link>

                  <Link
                    to="/signup"
                    className="mt-2 flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-250px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-blue-100/80 blur-[140px]" />

        <div className="pointer-events-none absolute right-[-200px] top-[250px] h-[500px] w-[500px] rounded-full bg-cyan-100/80 blur-[120px]" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-36 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-24 lg:pt-44">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/80 px-4 py-2 text-xs font-medium text-cyan-700 shadow-sm shadow-cyan-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
              </span>

              AI-powered website security platform
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Know your
              <br />

              <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">
                security posture.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              SecureSphere continuously analyzes your websites, identifies
              vulnerabilities, explains the risks, and gives you practical
              steps to fix them.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-sm font-semibold text-white shadow-xl shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30"
              >
                Start Free Security Scan
                <FiArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <a
                href="#platform"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-md"
              >
                Explore Platform
                <FiChevronRight />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <FiCheck className="text-cyan-500" />
                Free trial
              </span>

              <span className="flex items-center gap-2">
                <FiCheck className="text-cyan-500" />
                OWASP aligned
              </span>

              <span className="flex items-center gap-2">
                <FiCheck className="text-cyan-500" />
                AI-powered insights
              </span>
            </div>
          </div>

          {/* HERO DASHBOARD */}
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-cyan-200/30 blur-[90px]" />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_32px_64px_-24px_rgba(15,23,42,0.18)] sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    SECURITY OVERVIEW
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Company Website
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Protected
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["92", "Security Score"],
                  ["0", "Critical"],
                  ["3", "High Risk"],
                  ["18", "Total Findings"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="text-2xl font-bold text-slate-900">
                      {value}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      SECURITY SCORE
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      92<span className="text-sm text-slate-400">/100</span>
                    </p>
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-100 bg-white text-sm font-bold text-emerald-600 shadow-sm">
                    A
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["SSL / HTTPS", "Passed", "green"],
                  ["Security Headers", "Warning", "yellow"],
                  ["XSS Detection", "Passed", "green"],
                  ["Cookie Security", "Warning", "yellow"],
                ].map(([title, status, color]) => (
                  <div
                    key={title}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          color === "green"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {color === "green" ? <FiCheckCircle /> : <FiAlertTriangle />}
                      </div>

                      <span className="text-xs font-medium text-slate-700">
                        {title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold ${
                        color === "green"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50/80 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-white shadow-sm shadow-cyan-500/30">
                  <FiCpu />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    AI Security Insight
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    4 recommendations are ready for your website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRUST */}
        <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
          <div className="border-t border-slate-100 pt-8">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Built for modern web security
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-xs font-semibold text-slate-400">
              <span>OWASP</span>
              <span>AI SECURITY</span>
              <span>WEB APPLICATIONS</span>
              <span>VULNERABILITY MANAGEMENT</span>
              <span>SECURITY ANALYTICS</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="relative scroll-mt-24 border-t border-slate-100 bg-slate-50 py-24 sm:py-32"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/50 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
              <span className="h-px w-8 bg-cyan-500" />
              Platform capabilities
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Security intelligence,
              <span className="text-slate-400"> without the complexity.</span>
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-600">
              One platform for discovering vulnerabilities, understanding
              risk, managing findings, and continuously improving your
              security posture.
            </p>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FiGlobe,
                number: "01",
                title: "Website Security Scanner",
                text: "Analyze websites for security headers, SSL/TLS configuration, XSS indicators, injection risks, cookies, redirects, and information disclosure.",
              },
              {
                icon: FiCpu,
                number: "02",
                title: "AI Security Assistant",
                text: "Ask questions about your findings and receive clear explanations and practical remediation guidance.",
              },
              {
                icon: FiAlertTriangle,
                number: "03",
                title: "Vulnerability Management",
                text: "Track findings through discovery, assignment, remediation, verification, and closure.",
              },
              {
                icon: FiBarChart2,
                number: "04",
                title: "Security Analytics",
                text: "Visualize security scores, risk distribution, vulnerability trends, and improvements.",
              },
              {
                icon: FiLock,
                number: "05",
                title: "OWASP Mapping",
                text: "Connect discovered security issues to recognized OWASP categories and security concepts.",
              },
              {
                icon: FiActivity,
                number: "06",
                title: "Continuous Monitoring",
                text: "Keep your security posture visible and identify changes that require attention.",
              },
            ].map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.number}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/40"
                >
                  <div className="absolute right-5 top-5 text-5xl font-bold text-slate-200 transition-colors duration-300 group-hover:text-cyan-100">
                    {feature.number}
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600 transition-transform duration-300 group-hover:scale-105">
                    <Icon />
                  </div>

                  <h3 className="mt-6 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.text}
                  </p>

                  <div className="mt-6 flex items-center gap-1 text-xs font-medium text-cyan-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Explore feature
                    <FiArrowRight />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section
        id="platform"
        className="scroll-mt-24 border-t border-slate-100 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
                <span className="h-px w-8 bg-cyan-500" />
                Security intelligence
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Don't just find vulnerabilities.
                <span className="block text-slate-400">
                  Understand them.
                </span>
              </h2>

              <p className="mt-6 max-w-xl leading-8 text-slate-600">
                SecureSphere transforms technical security findings into
                understandable insights so developers and website owners can
                take action.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Risk-based severity classification",
                  "OWASP vulnerability mapping",
                  "AI-powered remediation guidance",
                  "Historical security tracking",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                      <FiCheck className="text-xs text-emerald-500" />
                    </div>

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-cyan-100/40 blur-[80px]" />

              <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_32px_64px_-24px_rgba(15,23,42,0.16)] sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      AI SECURITY FINDING
                    </p>

                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Missing Content-Security-Policy
                    </h3>
                  </div>

                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                    High
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <FiAlertTriangle />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Why this matters
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Without a Content-Security-Policy, browsers have fewer
                        controls to prevent malicious script execution.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    AI recommendation
                  </p>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-600">
                    Content-Security-Policy:
                    <br />
                    default-src 'self';
                    <br />
                    script-src 'self';
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-xs text-slate-500">
                    OWASP A05 · Security Misconfiguration
                  </span>

                  <span className="flex items-center gap-1 text-xs font-semibold text-cyan-600">
                    AI explained
                    <FiZap />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            ["100+", "Security Checks"],
            ["OWASP", "Risk Mapping"],
            ["24/7", "Monitoring Ready"],
            ["AI", "Security Intelligence"],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {value}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="scroll-mt-24 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
              Pricing
            </div>

            <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">
              Start free. Scale your security.
            </h2>

            <p className="mt-5 text-slate-500">
              Begin with the essentials and upgrade when your security needs
              grow.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {/* FREE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8">
              <p className="text-sm font-semibold text-slate-900">
                Free Trial
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Explore the SecureSphere platform.
              </p>

              <div className="mt-7 text-4xl font-bold text-slate-950">
                Free
              </div>

              <div className="mt-7 space-y-4">
                {[
                  "Website security scanning",
                  "Security dashboard",
                  "Vulnerability findings",
                  "AI Security Assistant",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-600"
                  >
                    <FiCheck className="text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                to="/signup"
                className="mt-8 flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-cyan-200 hover:bg-cyan-50"
              >
                Start Free
              </Link>
            </div>

            {/* PREMIUM */}
            <div className="relative rounded-3xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-7 shadow-xl shadow-cyan-100/50 sm:p-8">
              <div className="absolute right-7 top-7 rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-cyan-500/40">
                Recommended
              </div>

              <p className="text-sm font-semibold text-slate-900">
                Premium
              </p>

              <p className="mt-2 text-sm text-slate-500">
                For continuous website security.
              </p>

              <div className="mt-7 text-4xl font-bold text-slate-950">
                Pro
              </div>

              <div className="mt-7 space-y-4">
                {[
                  "Unlimited security scans",
                  "Continuous monitoring",
                  "Advanced analytics",
                  "AI security assistance",
                  "Advanced reports",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <FiCheck className="text-cyan-600" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                to="/signup"
                className="mt-8 flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-24 sm:px-6 sm:pb-32 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-6 py-16 text-center shadow-xl shadow-slate-200/60 sm:px-12">
          <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-cyan-200/50 blur-[100px]" />

          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
              <FiShield className="text-2xl" />
            </div>

            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold text-slate-950 sm:text-5xl">
              Your website deserves
              <span className="text-cyan-600"> better security.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Discover your security posture, understand your risks, and take
              the next step toward a more secure website.
            </p>

            <Link
              to="/signup"
              className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
            >
              Start Your Security Journey
              <FiArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-500/30">
                  <FiShield />
                </div>

                <span className="font-bold text-slate-900">
                  Secure<span className="text-cyan-600">Sphere</span>
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                AI-powered website security for discovering vulnerabilities,
                understanding risks, and continuously improving security.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product
              </h3>

              <div className="mt-4 space-y-3">
                <a
                  href="#features"
                  className="block text-sm text-slate-500 transition-colors hover:text-cyan-600"
                >
                  Features
                </a>

                <a
                  href="#platform"
                  className="block text-sm text-slate-500 transition-colors hover:text-cyan-600"
                >
                  Platform
                </a>

                <a
                  href="#pricing"
                  className="block text-sm text-slate-500 transition-colors hover:text-cyan-600"
                >
                  Pricing
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Account
              </h3>

              <div className="mt-4 space-y-3">
                <Link
                  to="/signin"
                  className="block text-sm text-slate-500 transition-colors hover:text-cyan-600"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  className="block text-sm text-slate-500 transition-colors hover:text-cyan-600"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} SecureSphere. All rights reserved.
            </p>

            <p className="flex items-center gap-1.5">
              Powered by
              <a
                href="https://himelportfilio.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-500 transition-colors hover:text-cyan-600"
              >
                Himel
              </a>
              <span className="text-slate-300">&amp;</span>
              <a
                href="https://ishrakul-islam.great-site.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-500 transition-colors hover:text-cyan-600"
              >
                Ishrakul Islam
              </a>
            </p>

            <p>AI-Powered Web Security Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}