import { z } from "zod"

export const novelSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  isbn: z.string().optional(),
  line1: z
    .string()
    .min(1, "Line 1 is required")
    .transform((val) => val.toLowerCase().trim()),
  line2: z
    .string()
    .min(1, "Line 2 is required")
    .transform((val) => val.toLowerCase().trim()),
  line3: z
    .string()
    .min(1, "Line 3 is required")
    .transform((val) => val.toLowerCase().trim()),
  line1Raw: z.string().optional(),
  line2Raw: z.string().optional(),
  line3Raw: z.string().optional(),
  url: z.string().url("Must be a valid URL"),
  language: z.string().min(2, "Language code is required").max(10),
  chapter: z.string().optional(),
  pageNumber: z.number().int().positive().optional().or(z.string().transform((val) => val ? parseInt(val) : undefined)),
  unlockContent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const novelUpdateSchema = novelSchema.partial()

export const novelQuerySchema = z.object({
  page: z.string().transform((val) => parseInt(val) || 1).optional(),
  limit: z.string().transform((val) => Math.min(parseInt(val) || 20, 100)).optional(),
  search: z.string().optional(),
  language: z.string().optional(),
  sort: z.enum(["title", "createdAt", "updatedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
})

export type NovelInput = z.infer<typeof novelSchema>
export type NovelUpdateInput = z.infer<typeof novelUpdateSchema>
export type NovelQuery = z.infer<typeof novelQuerySchema>
