import { z } from 'zod';

export const apiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  app_name: z.string().optional(),
  rate_limit: z.coerce.number().int().min(1, 'Rate limit must be at least 1').max(10000),
  expires_at: z.string().optional(),
});

export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
