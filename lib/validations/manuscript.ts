import { z } from 'zod'
import { OcrStatus, TextOrientation } from '@prisma/client'

/**
 * Schema for manuscript upload form
 */
export const uploadSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  author: z
    .string()
    .max(300, 'Author name must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  language: z
    .string()
    .regex(/^[a-z]{2,3}$/, 'Invalid language code (must be 2-3 lowercase letters)')
    .default('en'),
  orientationHint: z
    .enum([
      TextOrientation.HORIZONTAL,
      TextOrientation.VERTICAL_TATEGAKI,
      TextOrientation.MIXED,
      TextOrientation.UNKNOWN,
    ])
    .optional(),
})

export type UploadInput = z.infer<typeof uploadSchema>

/**
 * Schema for manuscript list query parameters
 */
export const manuscriptQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      OcrStatus.PENDING,
      OcrStatus.PROCESSING,
      OcrStatus.COMPLETED,
      OcrStatus.FAILED,
      OcrStatus.LOW_CONFIDENCE,
    ])
    .optional(),
  language: z.string().regex(/^[a-z]{2,3}$/).optional(),
  uploadedBy: z.string().email().optional(),
  search: z.string().min(1).max(200).optional(),
})

export type ManuscriptQuery = z.infer<typeof manuscriptQuerySchema>

/**
 * Schema for updating extracted words manually
 */
export const wordsUpdateSchema = z.object({
  line1Words: z
    .array(z.string().min(1).max(100))
    .min(1, 'Line 1 must have at least 1 word')
    .max(10, 'Line 1 can have at most 10 words'),
  line2Words: z
    .array(z.string().min(1).max(100))
    .min(1, 'Line 2 must have at least 1 word')
    .max(10, 'Line 2 can have at most 10 words'),
  line3Words: z
    .array(z.string().min(1).max(100))
    .min(1, 'Line 3 must have at least 1 word')
    .max(10, 'Line 3 can have at most 10 words'),
})

export type WordsUpdate = z.infer<typeof wordsUpdateSchema>

/**
 * Schema for converting manuscript to novel
 */
export const convertToNovelSchema = z.object({
  url: z.string().url('Invalid URL'),
  chapter: z.string().max(100).optional().or(z.literal('')),
  pageNumber: z.coerce.number().int().min(1).optional(),
  unlockContent: z.string().max(200).optional().or(z.literal('')),
  metadata: z.record(z.any()).optional(),
})

export type ConvertToNovel = z.infer<typeof convertToNovelSchema>

/**
 * Schema for manuscript ID parameter
 */
export const manuscriptIdSchema = z.object({
  id: z.string().cuid('Invalid manuscript ID'),
})

export type ManuscriptId = z.infer<typeof manuscriptIdSchema>

/**
 * Schema for reprocess request
 */
export const reprocessSchema = z.object({
  manuscriptId: z.string().cuid('Invalid manuscript ID'),
})

export type Reprocess = z.infer<typeof reprocessSchema>
