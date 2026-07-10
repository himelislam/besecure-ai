import { Router } from 'express';
import express from 'express';
import User from '../models/User.js';
import { getStripe } from '../config/stripe.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// This route sits outside app.js's apiLimiter (mounted before it, at a different
// path prefix, and before express.json()) — apply the same generous per-IP limit
// directly here so it isn't left completely unthrottled. Signature verification is
// the real auth control; this is just a backstop against request-flooding.
router.post('/', apiLimiter, express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ message: 'Stripe webhook signature verification failed', error: err.message });
    return res.status(400).json({ success: false, error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        await User.updateOne(
          { 'subscription.stripeCustomerId': subscription.customer },
          {
            $set: {
              'subscription.stripeSubscriptionId': subscription.id,
              'subscription.status': subscription.status,
              'subscription.plan': 'premium',
              'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
            },
          }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await User.updateOne(
          { 'subscription.stripeCustomerId': subscription.customer },
          {
            $set: {
              'subscription.status': subscription.status,
              'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
            },
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await User.updateOne(
          { 'subscription.stripeCustomerId': subscription.customer },
          { $set: { 'subscription.status': 'canceled', 'subscription.plan': 'free' } }
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await User.updateOne(
          { 'subscription.stripeCustomerId': invoice.customer },
          { $set: { 'subscription.status': 'past_due' } }
        );
        break;
      }

      default:
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
    }
  } catch (err) {
    // Log and still ack — Stripe requires 200 regardless, and retries wouldn't fix a
    // bug in our own update logic anyway.
    logger.error({ message: 'Error processing Stripe webhook', error: err.message, eventType: event.type });
  }

  res.status(200).json({ received: true });
});

export default router;
