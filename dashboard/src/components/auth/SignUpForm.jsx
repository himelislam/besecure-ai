import { useState } from "react";
import { Link } from "react-router";
import {
  FiShield,
  FiLock,
  FiActivity,
  FiArrowRight,
  FiMail,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { register } from "../../services/authService";
import { getApiError } from "../../lib/apiResponse";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isAgreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Email verification is disabled — the account is created already
      // verified and can sign in right away.
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setIsSubmitted(true);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* =====================================================
            LEFT SIDE — BRAND / SECURITY INFORMATION
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

            {/* Heading */}
            <p className="mb-3 text-sm font-medium text-cyan-400">
              Start your security journey
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Protect your website.
              <br />
              <span className="text-cyan-400">
                Understand your risks.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Create your SecureSphere account and gain access to
              intelligent security scanning, vulnerability management,
              analytics, and AI-powered security guidance.
            </p>

            {/* Feature Cards */}
            <div className="mt-10 space-y-4">

              <FeatureItem
                icon={<FiShield />}
                title="Automated Security Scanning"
                description="Identify common security risks across your web applications."
              />

              <FeatureItem
                icon={<FiActivity />}
                title="Security Analytics"
                description="Monitor security scores and vulnerability trends over time."
              />

              <FeatureItem
                icon={<FiLock />}
                title="AI-Powered Remediation"
                description="Understand vulnerabilities and learn how to fix them."
              />

            </div>

            {/* Trial badge */}
            <div className="mt-10 flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <FiCheckCircle />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-200">
                  Start with full access
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Explore the platform before choosing a plan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT SIDE — REGISTRATION FORM
        ====================================================== */}

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">

            {/* Mobile Logo */}
            <Link
              to="/"
              className="mb-10 inline-flex items-center gap-3 lg:hidden"
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
            {/* Heading */}
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-cyan-400">
                Create your account
              </p>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Build a safer web.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Create your account and start discovering security
                vulnerabilities before attackers do.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <p className="text-sm leading-5 text-red-300">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Full name
                </label>

                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    autoComplete="name"
                    required
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                  />
                </div>
              </div>

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
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
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

                {/* Password strength */}
                {formData.password && (
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
                      Password strength: {passwordStrength.label}
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
                  Confirm password
                </label>

                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
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

                {formData.confirmPassword && (
                  <p
                    className={`mt-2 text-xs ${
                      formData.password === formData.confirmPassword
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formData.password === formData.confirmPassword
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Terms */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(event) =>
                    setIsAgreed(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
                />

                <span className="text-xs leading-5 text-slate-500">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create SecureSphere account
                    <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Sign In */}
            <p className="mt-8 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                Sign in
              </Link>
            </p>
              </>
            ) : (
              /* =================================================
                 ACCOUNT CREATED — no email verification step; the
                 account can sign in immediately.
              ================================================== */
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
                  <FiCheckCircle className="h-8 w-8 text-emerald-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-emerald-400">
                  Account created
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  You're all set.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Your account is ready to go — sign in with:
                </p>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200">
                  {formData.email}
                </div>

                <Link
                  to="/signin"
                  className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Continue to sign in
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
              <FiLock className="h-3.5 w-3.5" />
              Your account information is protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURE ITEM
========================================================= */

function FeatureItem({ icon, title, description }) {
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