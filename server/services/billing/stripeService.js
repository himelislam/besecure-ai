import { getStripe } from '../../config/stripe.js';
import { AppError } from '../../utils/AppError.js';

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError('Billing is not configured', 503, 'BILLING_UNAVAILABLE');
  }
  return stripe;
}

export async function createCustomer(userId, email, name) {
  const stripe = requireStripe();
  return stripe.customers.create({ email, name, metadata: { userId: userId.toString() } });
}

export async function createCheckoutSession(stripeCustomerId) {
  const stripe = requireStripe();
  return stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/billing?success=true`,
    cancel_url: `${process.env.CLIENT_URL}/billing?canceled=true`,
  });
}

export async function createPortalSession(stripeCustomerId) {
  const stripe = requireStripe();
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/billing`,
  });
}

export async function getSubscription(stripeSubscriptionId) {
  const stripe = requireStripe();
  return stripe.subscriptions.retrieve(stripeSubscriptionId);
}
