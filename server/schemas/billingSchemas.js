import { z } from 'zod';

// 'premium' is the historical name for the "Pro" tier shown in the UI — kept
// as-is on the backend/Stripe side to avoid a data migration; only the
// dashboard-facing label is "Pro".
export const createCheckoutSchema = z.object({
  plan: z.enum(['premium', 'business']).default('premium'),
});
