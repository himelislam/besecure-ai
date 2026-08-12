import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  FiShield,
  FiLock,
  FiActivity,
  FiArrowRight,
  FiMail,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { getApiError } from "../../lib/apiResponse";

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const noticeMessage = location.state?.message;

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Optional: save only the user's preference — never the token itself.
      if (isChecked) {
        localStorage.setItem("securesphere_remember", "true");
      } else {
        localStorage.removeItem("securesphere_remember");
      }

      // Home lives at "/", not "/dashboard".
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // Wrong password, nonexistent email, and unverified email all come
      // back as the identical 401 "Invalid credentials" — the backend
      // deliberately doesn't let a caller distinguish them, so we just
      // surface whatever message it sent rather than guessing which case
      // this is.
      setError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* =====================================================
            LEFT SIDE — LOGIN FORM
        ====================================================== */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            {/* SecureSphere Logo */}
            <Link to="/" className="mb-10 inline-flex items-center gap-3">
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

            {/* Heading */}
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-cyan-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Secure your digital world.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Sign in to your SecureSphere workspace and continue
                monitoring the security of your web applications.
              </p>
            </div>

            {/* =================================================
                NOTICE (e.g. "password changed, please sign in again")
            ================================================== */}
            {noticeMessage && !error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <p className="text-sm leading-5 text-emerald-300">
                  {noticeMessage}
                </p>
              </div>
            )}

            {/* =================================================
                ERROR MESSAGE
            ================================================== */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                <p className="text-sm leading-5 text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
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
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-4 w-4" />
                    ) : (
                      <FaEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) =>
                    setIsChecked(event.target.checked)
                  }
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
                />

                <span className="text-sm text-slate-400">
                  Keep me signed in
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !formData.email.trim() ||
                  !formData.password
                }
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in securely
                    <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Register */}
            <p className="mt-8 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                Create an account
              </Link>
            </p>

            {/* Security Notice */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
              <FiLock className="h-3.5 w-3.5" />
              Your connection is protected
            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT SIDE — SECURITY PANEL
        ====================================================== */}
        <div className="relative hidden overflow-hidden border-l border-slate-800 bg-[#0a1728] lg:flex lg:items-center lg:justify-center">
          {/* Background Glow */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-lg px-12">
            {/* Status Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Security intelligence active
            </div>

            {/* Heading */}
            <h2 className="text-4xl font-bold leading-tight">
              Know your security.
              <br />
              <span className="text-cyan-400">
                Fix what matters.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              SecureSphere combines automated vulnerability scanning,
              security analytics, AI-powered guidance, and continuous
              monitoring in one security workspace.
            </p>

            {/* Security Score */}
            <div className="mt-10 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    Security score
                  </p>

                  <p className="mt-2 text-4xl font-bold">
                    94
                    <span className="text-lg text-slate-500">
                      /100
                    </span>
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-400/30">
                  <FiShield className="h-7 w-7 text-emerald-400" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" />
              </div>

              {/* Security Status */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <SecurityStatus
                  icon={<FiShield />}
                  label="SSL"
                  value="Secure"
                />

                <SecurityStatus
                  icon={<FiLock />}
                  label="Headers"
                  value="Protected"
                />

                <SecurityStatus
                  icon={<FiActivity />}
                  label="Risk"
                  value="Low"
                />
              </div>
            </div>

            {/* AI Assistant */}
            <div className="mt-8 flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <FiActivity />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-200">
                  AI-powered security assistance
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Understand vulnerabilities and receive actionable
                  remediation guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECURITY STATUS CARD
========================================================= */

function SecurityStatus({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">{value}</p>
    </div>
  );
}