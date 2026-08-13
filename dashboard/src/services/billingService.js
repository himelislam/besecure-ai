import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

// plan: "premium" (Pro) or "business". Returns a real Stripe-hosted URL —
// callers must do a full browser redirect (window.location.href), never
// fetch-and-render.
export const createCheckout = async (plan = "premium") => {
  const response = await api.post("/api/billing/create-checkout", { plan });
  return unwrapResponse(response); // { checkoutUrl }
};

export const createPortal = async () => {
  const response = await api.post("/api/billing/create-portal");
  return unwrapResponse(response); // { portalUrl }
};

// Response is deliberately whitelisted server-side — never expect
// stripeCustomerId/stripeSubscriptionId here.
export const getSubscription = async () => {
  const response = await api.get("/api/billing/subscription");
  return unwrapResponse(response); // { subscription: { status, plan, trialEnd, currentPeriodEnd } }
};
