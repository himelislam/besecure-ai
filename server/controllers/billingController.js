import { AppError } from '../utils/AppError.js';
import { createCustomer, createCheckoutSession, createPortalSession } from '../services/billing/stripeService.js';

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
    next(err);
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
    next(err);
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
