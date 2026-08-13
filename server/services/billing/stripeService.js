import { getStripe } from '../../config/stripe.js';
import { AppError } from '../../utils/AppError.js';

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError('Billing is not configured', 503, 'BILLING_UNAVAILABLE');
  }
  return stripe;
}

// Read lazily (not at module load) so tests / different environments can set
// these after import; matches how requireStripe() defers to process.env too.
function priceIdForPlan(plan) {
  const ids = {
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    business: process.env.STRIPE_BUSINESS_PRICE_ID,
  };
  return ids[plan];
}

export async function createCustomer(userId, email, name) {
  const stripe = requireStripe();
  return stripe.customers.create({ email, name, metadata: { userId: userId.toString() } });
}

export async function createCheckoutSession(stripeCustomerId, plan = 'premium') {
  const stripe = requireStripe();
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
  }
  return stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Stamped onto the Subscription object (not just this Session), so the
    // webhook can read subscription.metadata.plan directly instead of having
    // to map price ID -> plan name itself.
    subscription_data: { metadata: { plan } },
    // Must match the dashboard's actual route (see AppRoutes.jsx) — the
    // billing/subscription page is mounted at /subscription, not /billing.
    success_url: `${process.env.CLIENT_URL}/subscription?success=true`,
    cancel_url: `${process.env.CLIENT_URL}/subscription?canceled=true`,
  });
}

export async function createPortalSession(stripeCustomerId) {
  const stripe = requireStripe();
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/subscription`,
  });
}

export async function getSubscription(stripeSubscriptionId) {
  const stripe = requireStripe();
  return stripe.subscriptions.retrieve(stripeSubscriptionId);
}
