import { z } from 'zod';

export function extractDomain(url) {
  return new URL(url).hostname.toLowerCase();
}

export const createWebsiteSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .max(500)
    .transform((url) => {
      const parsed = new URL(url);
      return `https://${parsed.hostname.toLowerCase()}`;
    }),
  nickname: z.string().trim().min(1, 'Nickname is required').max(100),
});

export const updateWebsiteSchema = z
  .object({
    nickname: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
