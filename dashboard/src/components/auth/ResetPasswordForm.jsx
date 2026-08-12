import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FiShield,
  FiLock,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { resetPassword } from "../../services/authService";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsRateLimited(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, newPassword: password });
      setIsSuccess(true);
    } catch (err) {
      const apiError = getApiError(err);
      // Reset is capped at 3/hour — stricter than the other auth endpoints —
      // so it's worth calling out distinctly rather than blending it in
      // with a generic validation error.
      setIsRateLimited(apiError.code === ErrorCodes.RATE_LIMITED);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* =====================================================
            LEFT — SECURITY INFORMATION
        ====================================================== */}

        <div className="relative hidden overflow-hidden border-r border-slate-800 bg-[#0a1728] lg:flex lg:items-center lg:justify-center">

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
              Secure password recovery
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Create a stronger
              <br />
              <span className="text-cyan-400">
                security key.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Choose a strong password to protect your SecureSphere
              account and the security information associated with your
              websites.
            </p>

            {/* Security tips */}
            <div className="mt-10 space-y-4">

              <SecurityTip
                title="Use at least 8 characters"
                description="Longer passwords are harder to compromise."
              />

              <SecurityTip
                title="Mix different character types"
                description="Combine uppercase, lowercase, numbers, and symbols."
              />

              <SecurityTip
                title="Never reuse passwords"
                description="Use a unique password for your SecureSphere account."
              />

            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT — RESET PASSWORD
        ====================================================== */}

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">

            {/* Mobile Logo */}
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

            {!token ? (
              /* =================================================
                 NO TOKEN IN THE URL — nothing to submit against.
              ================================================== */
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/5">
                  <FiAlertTriangle className="h-8 w-8 text-red-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-red-400">
                  Invalid reset link
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  This link is missing its token.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Use the link from your password reset email, or request a
                  new one.
                </p>

                <Link
                  to="/forgot-password"
                  className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Request a new link
                  <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ) : !isSuccess ? (
              <>
                {/* Icon */}
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                  <FiLock className="h-6 w-6 text-cyan-400" />
                </div>

                {/* Heading */}
                <div className="mb-8">
                  <p className="mb-3 text-sm font-medium text-cyan-400">
                    Password recovery
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Reset your password.
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Create a new password for your SecureSphere account.
                    Make sure it's strong and unique.
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div
                    className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 ${
                      isRateLimited
                        ? "border-amber-500/20 bg-amber-500/10"
                        : "border-red-500/20 bg-red-500/10"
                    }`}
                  >
                    <FiAlertCircle
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        isRateLimited ? "text-amber-400" : "text-red-400"
                      }`}
                    />
                    <p
                      className={`text-sm leading-5 ${
                        isRateLimited ? "text-amber-300" : "text-red-300"
                      }`}
                    >
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        required
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-4 w-4" />
                        ) : (
                          <FaEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Strength */}
                    {password && (
                      <div className="mt-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full ${
                                level <= passwordStrength.level
                                  ? passwordStrength.bar
                                  : "bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>

                        <p
                          className={`mt-2 text-xs ${passwordStrength.text}`}
                        >
                          Password strength:{" "}
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Confirm new password
                    </label>

                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                        required
                        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) => !previous
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="h-4 w-4" />
                        ) : (
                          <FaEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {confirmPassword && (
                      <p
                        className={`mt-2 text-xs ${
                          password === confirmPassword
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {password === confirmPassword
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        Update password
                        <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back */}
                <Link
                  to="/signin"
                  className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-cyan-400"
                >
                  <FiArrowLeftIcon />
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
                  Password updated
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  You're all set.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Your SecureSphere password has been updated
                  successfully. You can now sign in using your new
                  password.
                </p>

                <Link
                  to="/signin"
                  className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Continue to sign in
                  <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}

            {/* Security notice */}
            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-600">
              <FiLock className="h-3.5 w-3.5" />
              Your password is protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECURITY TIP
========================================================= */

function SecurityTip({ title, description }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />

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

/* =========================================================
   BACK ICON
========================================================= */

function FiArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getPasswordStrength(password) {
  if (!password) {
    return {
      level: 0,
      label: "",
      bar: "bg-slate-800",
      text: "text-slate-500",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) {
    return {
      level: 1,
      label: "Weak",
      bar: "bg-red-500",
      text: "text-red-400",
    };
  }

  if (score === 2) {
    return {
      level: 2,
      label: "Fair",
      bar: "bg-yellow-500",
      text: "text-yellow-400",
    };
  }

  if (score === 3) {
    return {
      level: 3,
      label: "Good",
      bar: "bg-blue-500",
      text: "text-blue-400",
    };
  }

  return {
    level: 4,
    label: "Strong",
    bar: "bg-emerald-500",
    text: "text-emerald-400",
  };
}