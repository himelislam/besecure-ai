import { z } from 'zod';

export const createScanSchema = z.object({
  websiteId: z.string().min(1, 'websiteId is required'),
  type: z.enum(['baseline', 'deep']).default('baseline'),
});

export const listScansSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const listVulnerabilitiesSchema = z.object({
  websiteId: z.string().optional(),
  scanId: z.string().optional(),
  status: z
    .enum(['open', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'false_positive'])
    .optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  owaspCategory: z.string().optional(),
  sortBy: z.enum(['severity', 'createdAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const updateVulnerabilitySchema = z
  .object({
    status: z.enum(['open', 'assigned', 'in_progress', 'fixed', 'closed', 'false_positive']).optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((data) => data.status !== undefined || data.priority !== undefined || data.note !== undefined, {
    message: 'At least one of status, priority, or note is required',
  });
