import { useState } from "react";
import { Link } from "react-router";
import {
  FiShield,
  FiMail,
  FiArrowLeft,
  FiArrowRight,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { forgotPassword } from "../../services/authService";
import { getApiError } from "../../lib/apiResponse";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      // Always 200 regardless of whether the email exists — the backend
      // deliberately doesn't reveal that, so any success here just means
      // "the request went through," not "that email is registered."
      await forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* =====================================================
            LEFT — SECURITY INFORMATION
        ====================================================== */}

        <div className="relative hidden overflow-hidden border-r border-slate-800 bg-[#0a1728] lg:flex lg:items-center lg:justify-center">

          {/* Background glow */}
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-lg px-12">

            {/* Logo */}
            <Link to="/" className="mb-14 inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/20">
                <FiShield className="h-6 w-6 text-cyan-400" />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-wide">
                  Secure<span className="text-cyan-400">Sphere</span>
                </h1>

                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Security Intelligence
                </p>
              </div>
            </Link>

            <p className="mb-3 text-sm font-medium text-cyan-400">
              Account recovery
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Your account.
              <br />
              <span className="text-cyan-400">
                Still protected.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Forgetting your password doesn't mean losing access to your
              security workspace. We'll help you securely regain access.
            </p>

            {/* Security cards */}
            <div className="mt-10 space-y-4">

              <SecurityFeature
                icon={<FiLock />}
                title="Secure recovery"
                description="Password reset links are designed to protect your account."
              />

              <SecurityFeature
                icon={<FiMail />}
                title="Email verification"
                description="Recovery instructions are sent to your registered email."
              />

              <SecurityFeature
                icon={<FiShield />}
                title="Your security comes first"
                description="Your website scans and security data remain protected."
              />

            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT — FORGOT PASSWORD
        ====================================================== */}

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <Link
              to="/"
              className="mb-12 inline-flex items-center gap-3 lg:hidden"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-400/20">
                <FiShield className="h-6 w-6 text-cyan-400" />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-wide">
                  Secure<span className="text-cyan-400">Sphere</span>
                </h1>

                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Security Intelligence
                </p>
              </div>
            </Link>

            {!isSubmitted ? (
              <>
                {/* Icon */}
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                  <FiLock className="h-6 w-6 text-cyan-400" />
                </div>

                {/* Heading */}
                <div className="mb-8">
                  <p className="mb-3 text-sm font-medium text-cyan-400">
                    Account recovery
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Forgot your password?
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    No problem. Enter the email address associated with
                    your SecureSphere account and we'll send you a
                    password reset link.
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <p className="text-sm leading-5 text-red-300">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        Send reset link
                        <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back to login */}
                <Link
                  to="/signin"
                  className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-cyan-400"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </>
            ) : (
              /* =================================================
                 SUCCESS STATE
              ================================================== */

              <div className="text-center">

                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
                  <FiCheckCircle className="h-8 w-8 text-emerald-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-emerald-400">
                  Email sent
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Check your inbox.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  We've sent password reset instructions to:
                </p>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200">
                  {email}
                </div>

                <p className="mt-5 text-xs leading-5 text-slate-500">
                  If you don't see the email, check your spam or junk
                  folder.
                </p>

                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="mt-7 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Try another email
                </button>

                <Link
                  to="/signin"
                  className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-cyan-400"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            )}

            {/* Security notice */}
            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-600">
              <FiLock className="h-3.5 w-3.5" />
              Secure account recovery
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECURITY FEATURE
========================================================= */

function SecurityFeature({ icon, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-200">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}