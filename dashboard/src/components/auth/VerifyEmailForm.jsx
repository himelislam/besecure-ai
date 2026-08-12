import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FiShield,
  FiMail,
  FiCheckCircle,
  FiArrowRight,
  FiAlertTriangle,
} from "react-icons/fi";
import { verifyEmail } from "../../services/authService";
import { getApiError } from "../../lib/apiResponse";

// "pending" while the token is being checked, then "success" or "error".
// There's no resend-verification endpoint in the API — registering again
// with the same (still-unverified) email would just hit DUPLICATE_KEY, so
// the only real recovery path on failure is contacting support / re-reading
// the original email, not a form that pretends to trigger a new send.
export default function VerifyEmailForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(token ? "pending" : "missing");
  const [message, setMessage] = useState("");

  // Guards against firing verifyEmail(token) more than once for the same
  // token — the token is single-use server-side, so a duplicate request
  // (StrictMode's dev double-invoke, a fast re-navigation, etc.) would
  // always fail with "already used" even though the first request succeeded.
  // Keyed by token value (not a plain boolean) so a genuinely different
  // token — e.g. the user pastes a new link — still fires its own request.
  const attemptedTokenRef = useRef(null);

  // Tracks whether THIS effect instance is currently mounted, reset to true
  // on every run (including StrictMode's synchronous remount) rather than
  // captured once per closure — a plain per-run `cancelled` flag would get
  // set by StrictMode's first cleanup and never reset, permanently
  // suppressing the setState once the (deduped, still in-flight) request
  // from the first run eventually resolves.
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    if (token && attemptedTokenRef.current !== token) {
      attemptedTokenRef.current = token;

      verifyEmail(token)
        .then(() => {
          if (isMountedRef.current) {
            setStatus("success");
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            setMessage(getApiError(err).message);
            setStatus("error");
          }
        });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="relative hidden overflow-hidden border-r border-slate-800 bg-[#0a1728] lg:flex lg:items-center lg:justify-center">

          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-lg px-12">

            <Link
              to="/"
              className="mb-14 inline-flex items-center gap-3"
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

            <p className="mb-3 text-sm font-medium text-cyan-400">
              Account verification
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Verify your identity.
              <br />
              <span className="text-cyan-400">
                Protect your workspace.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Email verification helps ensure that only you can access
              your SecureSphere security dashboard and website audit
              information.
            </p>

            <div className="mt-10 space-y-5">

              <SecurityPoint
                number="01"
                title="Confirm your email"
                description="We'll send a verification link to your inbox."
              />

              <SecurityPoint
                number="02"
                title="Activate your account"
                description="Verify your email to unlock your security workspace."
              />

              <SecurityPoint
                number="03"
                title="Start securing websites"
                description="Add your first website and run your security audit."
              />

            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
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

            {status === "pending" && (
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-cyan-400">
                  Almost there
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Verifying your email...
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Hang tight while we confirm your verification link.
                </p>
              </div>
            )}

            {status === "missing" && (
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/5">
                  <FiAlertTriangle className="h-8 w-8 text-red-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-red-400">
                  Invalid link
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  This link is missing its token.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Open the verification link from your email again, or sign
                  up for a new account if it's no longer valid.
                </p>

                <Link
                  to="/signin"
                  className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Back to sign in
                </Link>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
                  <FiCheckCircle className="h-8 w-8 text-emerald-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-emerald-400">
                  Email verified
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  You're all set.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  Your email has been verified. You can now sign in to your
                  SecureSphere account.
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

            {status === "error" && (
              <div className="text-center">
                <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/5">
                  <FiAlertTriangle className="h-8 w-8 text-red-400" />
                </div>

                <p className="mb-3 text-sm font-medium text-red-400">
                  Verification failed
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  We couldn't verify that link.
                </h2>

                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                  {message}
                </p>

                <p className="mt-5 text-xs leading-5 text-slate-500">
                  Links are single-use and expire after 24 hours. If you've
                  already verified your account, just sign in — otherwise
                  check your inbox for the original email.
                </p>

                <Link
                  to="/signin"
                  className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Back to sign in
                </Link>
              </div>
            )}

            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-600">
              <FiShield className="h-3.5 w-3.5" />
              Secure account verification
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityPoint({ number, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5 text-xs font-semibold text-cyan-400">
        {number}
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
