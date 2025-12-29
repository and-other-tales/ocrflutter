import { prisma } from '../prisma'
import { OcrStatus, TextOrientation, Prisma } from '@prisma/client'
import { OcrError, OcrErrorCodes } from '../utils/errors'
import { storageService } from './storage.service'
import { queueService } from './queue.service'

export interface CreateManuscriptInput {
  title: string
  author?: string
  language: string
  orientationHint?: TextOrientation
  originalFilename: string
  fileSize: number
  mimeType: string
  pdfStorageUrl: string
  pdfStoragePath: string
  uploadedBy: string
}

export interface UpdateManuscriptWordsInput {
  line1Words: string[]
  line2Words: string[]
  line3Words: string[]
  editedBy: string
}

export interface ManuscriptFilters {
  status?: OcrStatus
  language?: string
  uploadedBy?: string
  search?: string
}

export interface ConvertToNovelInput {
  url: string
  chapter?: string
  pageNumber?: number
  unlockContent?: string
  metadata?: any
}

class ManuscriptService {
  /**
   * Create a new manuscript record
   */
  async createManuscript(input: CreateManuscriptInput): Promise<{
    manuscript: any
    jobId: string
  }> {
    try {
      // Create manuscript record
      const manuscript = await prisma.manuscript.create({
        data: {
          title: input.title,
          author: input.author,
          language: input.language,
          orientationHint: input.orientationHint,
          originalFilename: input.originalFilename,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          pdfStorageUrl: input.pdfStorageUrl,
          pdfStoragePath: input.pdfStoragePath,
          uploadedBy: input.uploadedBy,
          ocrStatus: OcrStatus.PENDING,
        },
      })

      // Queue OCR job
      const jobId = await queueService.addOcrJob(
        manuscript.id,
        manuscript.pdfStoragePath,
        manuscript.language,
        manuscript.orientationHint || undefined
      )

      // Update manuscript with job ID
      await prisma.manuscript.update({
        where: { id: manuscript.id },
        data: { ocrJobId: jobId },
      })

      console.log(`[Manuscript] Created manuscript ${manuscript.id} with job ${jobId}`)

      return {
        manuscript: {
          ...manuscript,
          ocrJobId: jobId,
        },
        jobId,
      }
    } catch (error: any) {
      console.error('[Manuscript] Failed to create manuscript:', error)
      throw new OcrError(
        `Failed to create manuscript: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Get manuscript by ID
   */
  async getManuscriptById(id: string): Promise<any> {
    try {
      const manuscript = await prisma.manuscript.findUnique({
        where: { id },
        include: {
          convertedToNovel: true,
        },
      })

      if (!manuscript) {
        throw new OcrError('Manuscript not found', OcrErrorCodes.UPLOAD_FAILED, 404)
      }

      return manuscript
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to get manuscript:', error)
      throw new OcrError(
        `Failed to get manuscript: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * List manuscripts with filters and pagination
   */
  async listManuscripts(
    filters: ManuscriptFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    manuscripts: any[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    try {
      const where: Prisma.ManuscriptWhereInput = {}

      if (filters.status) {
        where.ocrStatus = filters.status
      }

      if (filters.language) {
        where.language = filters.language
      }

      if (filters.uploadedBy) {
        where.uploadedBy = filters.uploadedBy
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { author: { contains: filters.search, mode: 'insensitive' } },
          { originalFilename: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      const [manuscripts, total] = await Promise.all([
        prisma.manuscript.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            convertedToNovel: {
              select: {
                id: true,
                title: true,
                url: true,
              },
            },
          },
        }),
        prisma.manuscript.count({ where }),
      ])

      return {
        manuscripts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    } catch (error: any) {
      console.error('[Manuscript] Failed to list manuscripts:', error)
      throw new OcrError(
        `Failed to list manuscripts: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Update manuscript OCR status
   */
  async updateOcrStatus(
    manuscriptId: string,
    status: OcrStatus,
    data?: {
      extractedWords?: any
      confidence?: number
      textOrientation?: TextOrientation
      errorMessage?: string
    }
  ): Promise<any> {
    try {
      const updateData: Prisma.ManuscriptUpdateInput = {
        ocrStatus: status,
      }

      if (status === OcrStatus.COMPLETED || status === OcrStatus.LOW_CONFIDENCE) {
        updateData.ocrProcessedAt = new Date()
      }

      if (data?.extractedWords) {
        updateData.extractedWords = data.extractedWords
      }

      if (data?.confidence !== undefined) {
        updateData.ocrConfidence = data.confidence
      }

      if (data?.textOrientation) {
        updateData.textOrientation = data.textOrientation
      }

      if (data?.errorMessage) {
        updateData.ocrErrorMessage = data.errorMessage
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: updateData,
      })

      console.log(`[Manuscript] Updated manuscript ${manuscriptId} status to ${status}`)

      return manuscript
    } catch (error: any) {
      console.error('[Manuscript] Failed to update OCR status:', error)
      throw new OcrError(
        `Failed to update OCR status: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(manuscriptId: string): Promise<number> {
    try {
      const manuscript = await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: {
          ocrRetryCount: {
            increment: 1,
          },
        },
        select: {
          ocrRetryCount: true,
        },
      })

      return manuscript.ocrRetryCount
    } catch (error: any) {
      console.error('[Manuscript] Failed to increment retry count:', error)
      throw new OcrError(
        `Failed to increment retry count: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Update extracted words manually
   */
  async updateExtractedWords(
    manuscriptId: string,
    input: UpdateManuscriptWordsInput
  ): Promise<any> {
    try {
      const manuscript = await this.getManuscriptById(manuscriptId)

      const extractedWords = manuscript.extractedWords || {}

      const updatedWords = {
        ...extractedWords,
        line1Words: input.line1Words,
        line2Words: input.line2Words,
        line3Words: input.line3Words,
      }

      const updated = await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: {
          extractedWords: updatedWords,
          manuallyEdited: true,
          editedBy: input.editedBy,
          editedAt: new Date(),
        },
      })

      console.log(`[Manuscript] Updated extracted words for manuscript ${manuscriptId}`)

      return updated
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to update extracted words:', error)
      throw new OcrError(
        `Failed to update extracted words: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Convert manuscript to novel
   */
  async convertToNovel(
    manuscriptId: string,
    input: ConvertToNovelInput,
    createdBy: string
  ): Promise<any> {
    try {
      const manuscript = await this.getManuscriptById(manuscriptId)

      // Check if already converted
      if (manuscript.convertedToNovelId) {
        throw new OcrError(
          'Manuscript already converted to novel',
          OcrErrorCodes.UPLOAD_FAILED,
          400
        )
      }

      // Check if OCR is completed
      if (manuscript.ocrStatus !== OcrStatus.COMPLETED && manuscript.ocrStatus !== OcrStatus.LOW_CONFIDENCE) {
        throw new OcrError(
          'OCR must be completed before converting to novel',
          OcrErrorCodes.UPLOAD_FAILED,
          400
        )
      }

      // Check if extracted words exist
      if (!manuscript.extractedWords) {
        throw new OcrError(
          'No extracted words available',
          OcrErrorCodes.NO_TEXT_EXTRACTED,
          400
        )
      }

      const extractedWords = manuscript.extractedWords as any

      // Create novel
      const novel = await prisma.novel.create({
        data: {
          title: manuscript.title,
          isbn: null,
          line1: extractedWords.line1Words?.join(' ').toLowerCase() || '',
          line2: extractedWords.line2Words?.join(' ').toLowerCase() || '',
          line3: extractedWords.line3Words?.join(' ').toLowerCase() || '',
          line1Raw: extractedWords.line1Words?.join(' ') || null,
          line2Raw: extractedWords.line2Words?.join(' ') || null,
          line3Raw: extractedWords.line3Words?.join(' ') || null,
          url: input.url,
          language: manuscript.language,
          chapter: input.chapter,
          pageNumber: input.pageNumber,
          unlockContent: input.unlockContent,
          metadata: input.metadata,
          createdBy,
        },
      })

      // Update manuscript with novel reference
      await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: {
          convertedToNovelId: novel.id,
        },
      })

      console.log(`[Manuscript] Converted manuscript ${manuscriptId} to novel ${novel.id}`)

      return {
        manuscript,
        novel,
      }
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to convert to novel:', error)
      throw new OcrError(
        `Failed to convert to novel: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Delete manuscript and associated files
   */
  async deleteManuscript(manuscriptId: string): Promise<void> {
    try {
      const manuscript = await this.getManuscriptById(manuscriptId)

      // Delete from GCS
      try {
        await storageService.deletePdf(manuscript.pdfStoragePath)
      } catch (error) {
        console.error('[Manuscript] Failed to delete from GCS:', error)
        // Continue with database deletion even if GCS deletion fails
      }

      // Remove job from queue if exists
      if (manuscript.ocrJobId) {
        try {
          await queueService.removeJob(manuscript.ocrJobId)
        } catch (error) {
          console.error('[Manuscript] Failed to remove job from queue:', error)
          // Continue with database deletion
        }
      }

      // Delete from database
      await prisma.manuscript.delete({
        where: { id: manuscriptId },
      })

      console.log(`[Manuscript] Deleted manuscript ${manuscriptId}`)
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to delete manuscript:', error)
      throw new OcrError(
        `Failed to delete manuscript: ${error.message}`,
        OcrErrorCodes.UPLOAD_FAILED,
        500
      )
    }
  }

  /**
   * Get OCR job status for a manuscript
   */
  async getJobStatus(manuscriptId: string): Promise<any> {
    try {
      const manuscript = await this.getManuscriptById(manuscriptId)

      if (!manuscript.ocrJobId) {
        return {
          status: manuscript.ocrStatus,
          message: 'No job ID found',
        }
      }

      const jobStatus = await queueService.getJobStatus(manuscript.ocrJobId)

      return {
        manuscriptStatus: manuscript.ocrStatus,
        jobStatus: jobStatus.status,
        progress: jobStatus.progress,
        error: jobStatus.error,
        attemptsMade: jobStatus.attemptsMade,
        result: jobStatus.result,
      }
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to get job status:', error)
      throw new OcrError(
        `Failed to get job status: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Reprocess manuscript (retry OCR)
   */
  async reprocessManuscript(manuscriptId: string): Promise<string> {
    try {
      const manuscript = await this.getManuscriptById(manuscriptId)

      // Check if file still exists
      const fileExists = await storageService.fileExists(manuscript.pdfStoragePath)
      if (!fileExists) {
        throw new OcrError('PDF file no longer exists in storage', OcrErrorCodes.GCS_ERROR, 404)
      }

      // Reset manuscript status
      await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: {
          ocrStatus: OcrStatus.PENDING,
          ocrErrorMessage: null,
        },
      })

      // Queue new OCR job
      const jobId = await queueService.addOcrJob(
        manuscript.id,
        manuscript.pdfStoragePath,
        manuscript.language,
        manuscript.orientationHint || undefined
      )

      // Update manuscript with new job ID
      await prisma.manuscript.update({
        where: { id: manuscriptId },
        data: { ocrJobId: jobId },
      })

      console.log(`[Manuscript] Reprocessing manuscript ${manuscriptId} with job ${jobId}`)

      return jobId
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Manuscript] Failed to reprocess manuscript:', error)
      throw new OcrError(
        `Failed to reprocess manuscript: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }
}

export const manuscriptService = new ManuscriptService()
