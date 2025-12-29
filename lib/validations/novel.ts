import { z } from 'zod';

export const novelSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  isbn: z.string().optional(),
  line1: z.string()
    .min(1, 'Line 1 is required')
    .transform(val => val.toLowerCase().trim()),
  line2: z.string()
    .min(1, 'Line 2 is required')
    .transform(val => val.toLowerCase().trim()),
  line3: z.string()
    .min(1, 'Line 3 is required')
    .transform(val => val.toLowerCase().trim()),
  line1_raw: z.string().optional(),
  line2_raw: z.string().optional(),
  line3_raw: z.string().optional(),
  url: z.string().url('Must be a valid URL'),
  language: z.enum(['en', 'sv', 'it', 'other'], {
    message: 'Please select a valid language',
  }),
  chapter: z.string().optional(),
  page_number: z.coerce.number().int().positive().optional(),
  unlock_content: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type NovelFormData = z.infer<typeof novelSchema>;
