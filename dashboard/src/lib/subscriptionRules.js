// Single source of truth for "does this user have premium access" — an
// exact mirror of User.isPremium() in server/models/User.js. Every
// tier-gated UI in the app (website cap, deep-scan gating, AI chat quota,
// report limits, this billing page) must derive from this, not from a
// separate ad-hoc check, or the frontend can show access the backend won't
// actually grant.
//
// Two things a naive `PREMIUM_STATUSES.includes(status)` check gets wrong:
// - "trialing" only counts once trialEnd is checked — a trial that has
//   already lapsed (no scheduled job flips the status automatically) is
//   still stored as status:'trialing' with a past trialEnd.
// - "past_due" is NOT premium per the backend, despite being a former
//   paying customer — a failed payment revokes access immediately.
export function isPremiumAccess(subscription) {
  if (!subscription) return false;
  const { status, trialEnd } = subscription;

  if (status === "active") return true;
  if (status === "trialing" && trialEnd && new Date(trialEnd).getTime() > Date.now()) return true;

  return false;
}

// Maps the backend's stored plan key to the label shown throughout the UI.
// "premium" is the historical backend/Stripe name for what the dashboard
// calls "Pro" — kept as-is server-side to avoid a data migration.
const PLAN_LABELS = { free: "Free", premium: "Pro", business: "Business" };

export function getPlanName(subscription) {
  return PLAN_LABELS[subscription?.plan] || "Free";
}

export function getSubscriptionLabel(subscription) {
  if (!subscription) return "Free";

  const { status } = subscription;

  if (status === "trialing") return isPremiumAccess(subscription) ? "Premium (trial)" : "Trial expired";
  if (status === "active") return "Premium";
  if (status === "past_due") return "Payment overdue";
  if (status === "canceled") return "Free";
  if (status === "incomplete") return "Payment incomplete";

  return "Free";
}

// Stripe's Customer Portal only works once a Stripe customer exists, which
// only happens after a checkout — the API returns 404 for anyone who's
// never checked out (see POST /api/billing/create-portal). trialing/
// canceled/incomplete users are assumed not to have a Stripe customer yet;
// active/past_due always do (getting to either requires a prior checkout).
export function canManageBilling(subscription) {
  return subscription?.status === "active" || subscription?.status === "past_due";
}
