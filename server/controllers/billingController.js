import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { createCustomer, createCheckoutSession, createPortalSession } from '../services/billing/stripeService.js';
import { createCheckoutSchema } from '../schemas/billingSchemas.js';

// Stripe SDK errors carry sensitive detail in .message (e.g. a masked API
// key: "Invalid API Key provided: sk_test_****0000") that must never reach
// the client. AppErrors we threw ourselves (missing billing account, Stripe
// not configured) and ZodErrors (bad request body) are already safe and pass
// through unchanged — errorHandler.js maps ZodError to a proper 400 itself.
function toSafeBillingError(err) {
  if (err instanceof AppError || err instanceof ZodError) {
    return err;
  }
  return new AppError(
    'Payment processing is temporarily unavailable. Please try again later.',
    503,
    'BILLING_UNAVAILABLE'
  );
}

export const createCheckout = async (req, res, next) => {
  try {
    const { plan } = createCheckoutSchema.parse(req.body);

    const user = req.user;

    // A user with a live Stripe subscription (paying or payment-failed —
    // either way stripeSubscriptionId is set) must go through the billing
    // portal to change or fix it. Without this guard, clicking "Upgrade"
    // twice — e.g. after a confusing redirect, a double click, or two open
    // tabs — creates a second, fully independent subscription on the same
    // customer and silently doubles their bill. Trialing/canceled/incomplete
    // users have no real subscription yet, so a fresh checkout is fine.
    if (user.subscription.stripeSubscriptionId && ['active', 'past_due'].includes(user.subscription.status)) {
      throw new AppError(
        'You already have an active subscription. Manage or change it from the billing portal.',
        409,
        'ALREADY_SUBSCRIBED'
      );
    }

    let stripeCustomerId = user.subscription.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createCustomer(user._id, user.email, user.name);
      stripeCustomerId = customer.id;
      user.subscription.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const session = await createCheckoutSession(stripeCustomerId, plan);

    res.status(200).json({ success: true, data: { checkoutUrl: session.url } });
  } catch (err) {
    next(toSafeBillingError(err));
  }
};

export const createPortal = async (req, res, next) => {
  try {
    const stripeCustomerId = req.user.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      throw new AppError('No billing account found for this user', 404, 'NOT_FOUND');
    }

    const session = await createPortalSession(stripeCustomerId);

    res.status(200).json({ success: true, data: { portalUrl: session.url } });
  } catch (err) {
    next(toSafeBillingError(err));
  }
};

export const getSubscription = async (req, res, next) => {
  try {
    const { status, plan, trialEnd, currentPeriodEnd } = req.user.subscription;
    res.status(200).json({ success: true, data: { subscription: { status, plan, trialEnd, currentPeriodEnd } } });
  } catch (err) {
    next(err);
  }
};
