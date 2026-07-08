import Stripe from 'stripe';
import { logger } from '../utils/logger.js';

let stripeClient = null;

export function initStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('Stripe is not configured — billing features will be unavailable');
    return null;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  logger.info('Stripe configured');
  return stripeClient;
}

export function getStripe() {
  if (!stripeClient) {
    return initStripe();
  }
  return stripeClient;
}

export default getStripe;
