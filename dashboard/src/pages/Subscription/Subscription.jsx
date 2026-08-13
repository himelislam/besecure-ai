import { useEffect, useState } from "react";
import {
  FiCheck,
  FiCreditCard,
  FiShield,
  FiZap,
  FiGlobe,
  FiRefreshCw,
  FiLock,
  FiArrowRight,
  FiAlertTriangle,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../hooks/useAuth";
import { getSubscription, createCheckout, createPortal } from "../../services/billingService";
import { getWebsites } from "../../services/websiteService";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";
import { getSubscriptionLabel, getPlanName, isPremiumAccess, canManageBilling } from "../../lib/subscriptionRules";

// `key` must match the backend's subscription.plan values (server/models/User.js)
// and the `plan` accepted by POST /api/billing/create-checkout — this is what
// makes each card charge the price it actually advertises, instead of every
// paid card silently checking out the same Stripe price.
const plans = [
  {
    key: "free",
    name: "Free",
    price: 0,
    description: "For getting started with basic security monitoring.",
    popular: false,
    features: [
      "3 websites",
      "Baseline security scans",
      "Basic vulnerability detection",
      "Security score",
      "OWASP Top 10 overview",
      "1 PDF report per scan",
    ],
  },
  {
    key: "premium",
    name: "Pro",
    price: 29,
    description: "For developers and businesses that need deeper protection.",
    popular: true,
    features: [
      "Unlimited websites",
      "Unlimited security scans",
      "Deep scans (verified domains)",
      "AI security recommendations",
      "200 AI messages / day",
      "Unlimited PDF reports",
      "Security roadmap",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 49,
    description: "For teams managing multiple websites and applications.",
    popular: false,
    features: [
      "Everything in Pro",
      "Priority AI analysis",
      "Team security dashboard",
      "Priority support",
      "Advanced reporting",
    ],
  },
];

// checkout/portal-session creation failures are almost always server-side
// config issues (bad Stripe key, account not set up), never something the
// user can act on — and the raw error can carry sensitive detail (e.g. a
// masked API key). Same treatment as the AI_UNAVAILABLE generic message
// used for chat/roadmap: don't render err.message for these two calls.
const BILLING_GENERIC_ERROR = "Payment processing is temporarily unavailable, please try again later.";

const STATUS_BADGE_STYLES = {
  trialing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  active: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  past_due: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  canceled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  incomplete: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
};

function daysUntil(dateString) {
  if (!dateString) return null;
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const Subscription = () => {
  const { user, isPremium, updateSubscription } = useAuth();

  const [subscription, setSubscription] = useState(user?.subscription || null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);
  const [subError, setSubError] = useState("");

  const [websiteCount, setWebsiteCount] = useState(null);

  const [isRedirectingCheckout, setIsRedirectingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [isRedirectingPortal, setIsRedirectingPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  useEffect(() => {
    getSubscription()
      .then(({ subscription: fresh }) => {
        setSubscription(fresh);
        // GET /api/billing/subscription is the authoritative read — sync it
        // into the cached user object so every other tier-gated screen in
        // the app (website cap, deep scans, AI quota, reports) sees the
        // same fresh state instead of a stale login-time snapshot.
        updateSubscription(fresh);
      })
      .catch((err) => setSubError(getApiError(err).message))
      .finally(() => setIsLoadingSub(false));

    getWebsites()
      .then((data) => setWebsiteCount(data.total))
      .catch(() => {
        // Non-critical — the websites stat just falls back to "—".
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (planKey = "premium") => {
    setCheckoutError("");
    setIsRedirectingPortal(false);
    setPortalError("");
    setIsRedirectingCheckout(true);

    try {
      const { checkoutUrl } = await createCheckout(planKey);
      window.location.href = checkoutUrl; // real Stripe-hosted page — full redirect, not a fetch
    } catch (err) {
      const apiError = getApiError(err);

      // Server-authored and already safe to show verbatim — unlike other
      // checkout failures (Stripe SDK errors etc.), which stay hidden behind
      // the generic message so we never leak raw Stripe error text.
      if (apiError.code === ErrorCodes.ALREADY_SUBSCRIBED) {
        setCheckoutError(apiError.message);
      } else {
        setCheckoutError(BILLING_GENERIC_ERROR);
      }

      setIsRedirectingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalError("");
    setCheckoutError("");
    setIsRedirectingCheckout(false);
    setIsRedirectingPortal(true);

    try {
      const { portalUrl } = await createPortal();
      window.location.href = portalUrl; // real Stripe-hosted page — full redirect, not a fetch
    } catch (err) {
      const apiError = getApiError(err);

      if (apiError.code === ErrorCodes.NOT_FOUND) {
        setPortalError("You haven't subscribed yet — subscribe first to manage billing.");
      } else {
        setPortalError(BILLING_GENERIC_ERROR);
      }

      setIsRedirectingPortal(false);
    }
  };

  const status = subscription?.status;
  // isPremium from useAuth() reflects the cached user object, which this
  // page keeps in sync above — using it directly (rather than recomputing)
  // keeps this page and the rest of the app reading the exact same value.
  const premiumAccess = subscription ? isPremiumAccess(subscription) : isPremium;
  // The actual purchased tier (Free/Pro/Business), independent of whether
  // access is currently active — e.g. a past_due Business subscriber still
  // reads "Business" here, with the separate past-due banner explaining why
  // access is blocked, rather than being relabeled "Free".
  const currentPlanName = getPlanName(subscription);
  const trialDaysLeft = status === "trialing" ? daysUntil(subscription?.trialEnd) : null;
  const canManage = canManageBilling(subscription);

  return (
    <>
      <PageMeta
        title="Subscription | SecureSphere"
        description="Manage your SecureSphere subscription and billing"
      />

      <div className="space-y-8">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Subscription
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose the plan that fits your security needs.
          </p>
        </div>

        {subError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {subError}
          </div>
        )}

        {/* PAST DUE BANNER */}
        {status === "past_due" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Your last payment failed
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                  Update your billing details to restore premium access. It may take a
                  few minutes after updating for your account to reflect the change.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManageBilling}
              disabled={isRedirectingPortal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Update Billing
            </button>
          </div>
        )}

        {/* TRIAL BANNER */}
        {status === "trialing" && (
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
              premiumAccess
                ? "border-cyan-200 bg-cyan-50 dark:border-cyan-500/20 dark:bg-cyan-500/10"
                : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start gap-3">
              <FiZap className={`mt-0.5 shrink-0 ${premiumAccess ? "text-cyan-500" : "text-gray-400"}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  {premiumAccess
                    ? `Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`
                    : "Your trial has ended"}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {premiumAccess
                    ? `You have full premium access until ${new Date(subscription.trialEnd).toLocaleDateString()}. Add a payment method to keep it afterward.`
                    : "Upgrade to premium to keep using deep scans, unlimited websites, and AI features."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCheckout("premium")}
              disabled={isRedirectingCheckout}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedirectingCheckout ? "Redirecting..." : "Add Payment Method"}
            </button>
          </div>
        )}

        {/* CURRENT PLAN */}
        <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white dark:border-cyan-500/20 dark:from-cyan-500/10 dark:to-white/[0.03]">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-sm">
                <FiShield className="h-6 w-6" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Current Plan: {currentPlanName}
                  </h2>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.canceled}`}>
                    {getSubscriptionLabel(subscription)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {isLoadingSub
                    ? "Loading your subscription..."
                    : premiumAccess
                      ? "Your premium plan is currently active."
                      : "Your free plan is currently active."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={canManage ? handleManageBilling : () => handleCheckout("premium")}
              disabled={isRedirectingCheckout || isRedirectingPortal || isLoadingSub}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedirectingCheckout || isRedirectingPortal
                ? "Redirecting..."
                : canManage
                  ? "Manage Billing"
                  : "Upgrade Plan"}
              <FiArrowRight />
            </button>
          </div>

          {(checkoutError || portalError) && (
            <p className="px-6 pb-4 text-sm text-red-600">{checkoutError || portalError}</p>
          )}

          <div className="grid grid-cols-1 border-t border-cyan-100 dark:border-cyan-500/10 sm:grid-cols-3">
            <div className="border-r border-cyan-100 p-5 dark:border-cyan-500/10 sm:border-r">
              <p className="text-xs text-gray-500 dark:text-gray-400">Websites</p>
              <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white">
                {websiteCount ?? "—"} / {premiumAccess ? "Unlimited" : "3"}
              </p>
            </div>

            <div className="border-r border-cyan-100 p-5 dark:border-cyan-500/10 sm:border-r">
              <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
              <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white capitalize">
                {subscription?.plan || "free"}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {status === "trialing" ? "Trial Ends" : "Renews"}
              </p>
              <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white">
                {status === "trialing" && subscription?.trialEnd
                  ? new Date(subscription.trialEnd).toLocaleDateString()
                  : status === "active" && subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* PLANS */}
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Choose Your Plan
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upgrade anytime as your security requirements grow.
            </p>

            {/* Same error state as the top card's button — repeated here since
                a checkout failure triggered from one of the plan cards below
                would otherwise render only near the top of the page, easy to
                miss without scrolling up. */}
            {(checkoutError || portalError) && (
              <p className="mt-3 text-sm text-red-600">{checkoutError || portalError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-white/[0.03] ${
                  plan.popular
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/10"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                    {plan.name === "Free" ? (
                      <FiShield className="text-cyan-500" />
                    ) : plan.name === "Pro" ? (
                      <FiZap className="text-cyan-500" />
                    ) : (
                      <FiGlobe className="text-cyan-500" />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {plan.name}
                  </h3>

                  <p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500 dark:text-gray-400">
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-bold text-gray-800 dark:text-white">
                      ${plan.price}
                    </span>

                    <span className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                      / month
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={plan.name === currentPlanName || isRedirectingCheckout}
                  onClick={plan.key === "free" ? undefined : () => handleCheckout(plan.key)}
                  className={`mb-7 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    plan.name === currentPlanName
                      ? "cursor-default border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      : plan.popular
                        ? "bg-cyan-500 text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-cyan-500 hover:text-cyan-500 dark:border-gray-700 dark:bg-transparent dark:text-gray-300"
                  }`}
                >
                  {plan.name === currentPlanName ? "Current Plan" : "Upgrade to " + plan.name}

                  {plan.name !== currentPlanName && <FiArrowRight />}
                </button>

                <div className="mb-4 border-t border-gray-100 pt-6 dark:border-gray-800">
                  <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
                    What's included
                  </p>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10">
                          <FiCheck className="h-3.5 w-3.5 text-green-500" />
                        </span>

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BILLING INFORMATION */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* PAYMENT */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <FiCreditCard className="text-blue-500" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Payment Method
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Managed securely through Stripe.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-5 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <FiCreditCard className="text-gray-500" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {canManage ? "Manage in Stripe" : "No payment method"}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {canManage ? "Update your card or billing details." : "Added when you subscribe."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={canManage ? handleManageBilling : () => handleCheckout("premium")}
                  disabled={isRedirectingCheckout || isRedirectingPortal}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-cyan-500 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                >
                  {canManage ? "Manage" : "Subscribe"}
                </button>
              </div>
            </div>
          </div>

          {/* BILLING */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
                <FiRefreshCw className="text-purple-500" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Billing & Invoices
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage your billing information.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    Billing cycle
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {premiumAccess ? "Monthly billing" : "No active billing"}
                  </p>
                </div>

                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {currentPlanName}
                </span>
              </div>

              <button
                type="button"
                onClick={canManage ? handleManageBilling : () => handleCheckout("premium")}
                disabled={isRedirectingCheckout || isRedirectingPortal}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-cyan-500 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
              >
                <span>{canManage ? "View billing history" : "Subscribe to view billing history"}</span>
                <FiArrowRight />
              </button>
            </div>
          </div>
        </div>

        {/* SECURITY NOTICE */}
        <div className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
            <FiLock className="text-green-500" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              Secure billing
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Your payment information is securely processed by Stripe. SecureSphere
              does not store your complete card details.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Subscription;
