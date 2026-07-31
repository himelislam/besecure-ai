import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { getStripe } from '../config/stripe.js';
import { createVerifiedUser } from './helpers.js';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function signedRequest(eventObject) {
  const stripe = getStripe();
  const payload = JSON.stringify(eventObject);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });

  return request(app)
    .post('/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', header)
    .send(payload);
}

function fakeEvent(type, dataObject) {
  return {
    id: 'evt_test_' + Math.random().toString(36).slice(2),
    object: 'event',
    type,
    data: { object: dataObject },
  };
}

describe('Stripe billing webhook', () => {
  it('rejects a tampered payload — signature was computed over different content', async () => {
    const stripe = getStripe();
    const realPayload = JSON.stringify(fakeEvent('customer.subscription.updated', { customer: 'cus_real' }));
    const header = stripe.webhooks.generateTestHeaderString({ payload: realPayload, secret: WEBHOOK_SECRET });

    // Send a DIFFERENT body than what was signed — constructEvent must reject it.
    const tamperedPayload = JSON.stringify(fakeEvent('customer.subscription.updated', { customer: 'cus_attacker_injected' }));

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(tamperedPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/signature verification failed/i);
  });

  it('rejects a request with no signature header at all', async () => {
    const payload = JSON.stringify(fakeEvent('customer.subscription.updated', { customer: 'cus_x' }));
    const res = await request(app).post('/webhooks/stripe').set('Content-Type', 'application/json').send(payload);
    expect(res.status).toBe(400);
  });

  it('customer.subscription.created activates premium and stores the subscription id/period end', async () => {
    const user = await createVerifiedUser('webhookcreated@example.com', {
      subscription: { stripeCustomerId: 'cus_created_test', status: 'trialing', plan: 'free' },
    });

    const periodEndUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const res = await signedRequest(
      fakeEvent('customer.subscription.created', {
        id: 'sub_created_test',
        customer: 'cus_created_test',
        status: 'active',
        current_period_end: periodEndUnix,
      })
    );

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated.subscription.stripeSubscriptionId).toBe('sub_created_test');
    expect(updated.subscription.status).toBe('active');
    expect(updated.subscription.plan).toBe('premium');
    expect(Math.floor(updated.subscription.currentPeriodEnd.getTime() / 1000)).toBe(periodEndUnix);
  });

  it('customer.subscription.updated updates status and period end only', async () => {
    const user = await createVerifiedUser('webhookupdated@example.com', {
      subscription: { stripeCustomerId: 'cus_updated_test', stripeSubscriptionId: 'sub_updated_test', status: 'active', plan: 'premium' },
    });

    const periodEndUnix = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;
    const res = await signedRequest(
      fakeEvent('customer.subscription.updated', {
        id: 'sub_updated_test',
        customer: 'cus_updated_test',
        status: 'past_due',
        current_period_end: periodEndUnix,
      })
    );

    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.subscription.status).toBe('past_due');
    expect(Math.floor(updated.subscription.currentPeriodEnd.getTime() / 1000)).toBe(periodEndUnix);
    expect(updated.subscription.plan).toBe('premium'); // untouched by this event type
  });

  it('customer.subscription.deleted downgrades the user to canceled/free', async () => {
    const user = await createVerifiedUser('webhookdeleted@example.com', {
      subscription: { stripeCustomerId: 'cus_deleted_test', stripeSubscriptionId: 'sub_deleted_test', status: 'active', plan: 'premium' },
    });

    const res = await signedRequest(
      fakeEvent('customer.subscription.deleted', {
        id: 'sub_deleted_test',
        customer: 'cus_deleted_test',
      })
    );

    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.subscription.status).toBe('canceled');
    expect(updated.subscription.plan).toBe('free');
  });

  it('invoice.payment_failed marks the subscription past_due', async () => {
    const user = await createVerifiedUser('webhookinvoicefailed@example.com', {
      subscription: { stripeCustomerId: 'cus_invoice_test', stripeSubscriptionId: 'sub_invoice_test', status: 'active', plan: 'premium' },
    });

    const res = await signedRequest(
      fakeEvent('invoice.payment_failed', {
        id: 'in_test',
        customer: 'cus_invoice_test',
      })
    );

    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.subscription.status).toBe('past_due');
  });
});
