import { AppError } from '../utils/AppError.js';
import { createCustomer, createCheckoutSession, createPortalSession } from '../services/billing/stripeService.js';

// Stripe SDK errors carry sensitive detail in .message (e.g. a masked API
// key: "Invalid API Key provided: sk_test_****0000") that must never reach
// the client. AppErrors we threw ourselves (missing billing account, Stripe
// not configured) are already safe and pass through unchanged.
function toSafeBillingError(err) {
  if (err instanceof AppError) {
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
    const user = req.user;
    let stripeCustomerId = user.subscription.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createCustomer(user._id, user.email, user.name);
      stripeCustomerId = customer.id;
      user.subscription.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const session = await createCheckoutSession(stripeCustomerId);

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
