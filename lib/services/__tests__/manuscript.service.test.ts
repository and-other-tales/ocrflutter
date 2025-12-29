import { manuscriptService } from '../manuscript.service'
import { OcrStatus, TextOrientation } from '@prisma/client'
import { OcrErrorCodes } from '../../utils/errors'

// Mock dependencies
jest.mock('../../prisma', () => ({
  prisma: {
    manuscript: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    novel: {
      create: jest.fn(),
    },
  },
}))

jest.mock('../storage.service', () => ({
  storageService: {
    deletePdf: jest.fn(),
    fileExists: jest.fn(),
  },
}))

jest.mock('../queue.service', () => ({
  queueService: {
    addOcrJob: jest.fn(),
    removeJob: jest.fn(),
    getJobStatus: jest.fn(),
  },
}))

import { prisma } from '../../prisma'
import { storageService } from '../storage.service'
import { queueService } from '../queue.service'

describe('ManuscriptService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createManuscript', () => {
    it('should create manuscript and queue OCR job', async () => {
      const mockManuscript = {
        id: 'test-id',
        title: 'Test Novel',
        language: 'en',
        pdfStoragePath: 'manuscripts/test.pdf',
        ocrStatus: OcrStatus.PENDING,
        orientationHint: null,
      }

      ;(prisma.manuscript.create as jest.Mock).mockResolvedValue(mockManuscript)
      ;(queueService.addOcrJob as jest.Mock).mockResolvedValue('job-123')
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue({
        ...mockManuscript,
        ocrJobId: 'job-123',
      })

      const result = await manuscriptService.createManuscript({
        title: 'Test Novel',
        language: 'en',
        originalFilename: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        pdfStorageUrl: 'https://storage.googleapis.com/bucket/test.pdf',
        pdfStoragePath: 'manuscripts/test.pdf',
        uploadedBy: 'test@example.com',
      })

      expect(prisma.manuscript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Novel',
          language: 'en',
          ocrStatus: OcrStatus.PENDING,
        }),
      })

      expect(queueService.addOcrJob).toHaveBeenCalledWith(
        'test-id',
        'manuscripts/test.pdf',
        'en',
        undefined
      )

      expect(result.manuscript.id).toBe('test-id')
      expect(result.jobId).toBe('job-123')
    })

    it('should pass valid orientation hint to queue', async () => {
      const mockManuscript = {
        id: 'test-id',
        title: 'Test Novel',
        language: 'ja',
        pdfStoragePath: 'manuscripts/test.pdf',
        ocrStatus: OcrStatus.PENDING,
        orientationHint: TextOrientation.VERTICAL_TATEGAKI,
      }

      ;(prisma.manuscript.create as jest.Mock).mockResolvedValue(mockManuscript)
      ;(queueService.addOcrJob as jest.Mock).mockResolvedValue('job-123')
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue(mockManuscript)

      await manuscriptService.createManuscript({
        title: 'Test Novel',
        language: 'ja',
        orientationHint: TextOrientation.VERTICAL_TATEGAKI,
        originalFilename: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        pdfStorageUrl: 'https://storage.googleapis.com/bucket/test.pdf',
        pdfStoragePath: 'manuscripts/test.pdf',
        uploadedBy: 'test@example.com',
      })

      expect(queueService.addOcrJob).toHaveBeenCalledWith(
        'test-id',
        'manuscripts/test.pdf',
        'ja',
        TextOrientation.VERTICAL_TATEGAKI
      )
    })

    it('should not pass MIXED orientation hint to queue', async () => {
      const mockManuscript = {
        id: 'test-id',
        title: 'Test Novel',
        pdfStoragePath: 'manuscripts/test.pdf',
        language: 'en',
        ocrStatus: OcrStatus.PENDING,
        orientationHint: TextOrientation.MIXED,
      }

      ;(prisma.manuscript.create as jest.Mock).mockResolvedValue(mockManuscript)
      ;(queueService.addOcrJob as jest.Mock).mockResolvedValue('job-123')
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue(mockManuscript)

      await manuscriptService.createManuscript({
        title: 'Test Novel',
        language: 'en',
        orientationHint: TextOrientation.MIXED,
        originalFilename: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        pdfStorageUrl: 'https://storage.googleapis.com/bucket/test.pdf',
        pdfStoragePath: 'manuscripts/test.pdf',
        uploadedBy: 'test@example.com',
      })

      // MIXED should not be passed, undefined instead
      expect(queueService.addOcrJob).toHaveBeenCalledWith(
        'test-id',
        'manuscripts/test.pdf',
        'en',
        undefined
      )
    })
  })

  describe('getManuscriptById', () => {
    it('should return manuscript by ID', async () => {
      const mockManuscript = {
        id: 'test-id',
        title: 'Test Novel',
        ocrStatus: OcrStatus.COMPLETED,
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)

      const result = await manuscriptService.getManuscriptById('test-id')

      expect(prisma.manuscript.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: { convertedToNovel: true },
      })
      expect(result).toEqual(mockManuscript)
    })

    it('should throw error if manuscript not found', async () => {
      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(manuscriptService.getManuscriptById('invalid-id')).rejects.toThrow(
        'Manuscript not found'
      )
    })
  })

  describe('listManuscripts', () => {
    it('should list manuscripts with pagination', async () => {
      const mockManuscripts = [
        { id: '1', title: 'Novel 1', ocrStatus: OcrStatus.COMPLETED },
        { id: '2', title: 'Novel 2', ocrStatus: OcrStatus.PENDING },
      ]

      ;(prisma.manuscript.findMany as jest.Mock).mockResolvedValue(mockManuscripts)
      ;(prisma.manuscript.count as jest.Mock).mockResolvedValue(10)

      const result = await manuscriptService.listManuscripts({}, 1, 2)

      expect(result.manuscripts).toEqual(mockManuscripts)
      expect(result.total).toBe(10)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(2)
      expect(result.totalPages).toBe(5)
    })

    it('should filter manuscripts by status', async () => {
      ;(prisma.manuscript.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.manuscript.count as jest.Mock).mockResolvedValue(0)

      await manuscriptService.listManuscripts({
        status: OcrStatus.COMPLETED,
      })

      expect(prisma.manuscript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ocrStatus: OcrStatus.COMPLETED },
        })
      )
    })

    it('should filter manuscripts by language', async () => {
      ;(prisma.manuscript.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.manuscript.count as jest.Mock).mockResolvedValue(0)

      await manuscriptService.listManuscripts({ language: 'ja' })

      expect(prisma.manuscript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { language: 'ja' },
        })
      )
    })

    it('should search manuscripts by title, author, or filename', async () => {
      ;(prisma.manuscript.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.manuscript.count as jest.Mock).mockResolvedValue(0)

      await manuscriptService.listManuscripts({ search: 'test' })

      expect(prisma.manuscript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { author: { contains: 'test', mode: 'insensitive' } },
              { originalFilename: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        })
      )
    })
  })

  describe('updateOcrStatus', () => {
    it('should update OCR status to COMPLETED', async () => {
      const mockManuscript = {
        id: 'test-id',
        ocrStatus: OcrStatus.COMPLETED,
      }

      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue(mockManuscript)

      const result = await manuscriptService.updateOcrStatus('test-id', OcrStatus.COMPLETED, {
        extractedWords: {
          line1Words: ['word1', 'word2', 'word3'],
          line2Words: ['word4', 'word5', 'word6'],
          line3Words: ['word7', 'word8', 'word9'],
        },
        confidence: 95.5,
        textOrientation: TextOrientation.HORIZONTAL,
      })

      expect(prisma.manuscript.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          ocrStatus: OcrStatus.COMPLETED,
          ocrProcessedAt: expect.any(Date),
          ocrConfidence: 95.5,
          textOrientation: TextOrientation.HORIZONTAL,
        }),
      })

      expect(result.ocrStatus).toBe(OcrStatus.COMPLETED)
    })

    it('should update OCR status to FAILED with error message', async () => {
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue({
        id: 'test-id',
        ocrStatus: OcrStatus.FAILED,
      })

      await manuscriptService.updateOcrStatus('test-id', OcrStatus.FAILED, {
        errorMessage: 'OCR processing failed',
      })

      expect(prisma.manuscript.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          ocrStatus: OcrStatus.FAILED,
          ocrErrorMessage: 'OCR processing failed',
        }),
      })
    })
  })

  describe('updateExtractedWords', () => {
    it('should update extracted words manually', async () => {
      const mockManuscript = {
        id: 'test-id',
        extractedWords: {
          line1Words: ['old1', 'old2', 'old3'],
          line2Words: ['old4', 'old5', 'old6'],
          line3Words: ['old7', 'old8', 'old9'],
          rawText: 'old text',
        },
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue({
        ...mockManuscript,
        manuallyEdited: true,
      })

      await manuscriptService.updateExtractedWords('test-id', {
        line1Words: ['new1', 'new2', 'new3'],
        line2Words: ['new4', 'new5', 'new6'],
        line3Words: ['new7', 'new8', 'new9'],
        editedBy: 'admin@example.com',
      })

      expect(prisma.manuscript.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          manuallyEdited: true,
          editedBy: 'admin@example.com',
          editedAt: expect.any(Date),
          extractedWords: {
            line1Words: ['new1', 'new2', 'new3'],
            line2Words: ['new4', 'new5', 'new6'],
            line3Words: ['new7', 'new8', 'new9'],
            rawText: 'old text',
          },
        }),
      })
    })
  })

  describe('deleteManuscript', () => {
    it('should delete manuscript and cleanup resources', async () => {
      const mockManuscript = {
        id: 'test-id',
        pdfStoragePath: 'manuscripts/test.pdf',
        ocrJobId: 'job-123',
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(storageService.deletePdf as jest.Mock).mockResolvedValue(undefined)
      ;(queueService.removeJob as jest.Mock).mockResolvedValue(undefined)
      ;(prisma.manuscript.delete as jest.Mock).mockResolvedValue(mockManuscript)

      await manuscriptService.deleteManuscript('test-id')

      expect(storageService.deletePdf).toHaveBeenCalledWith('manuscripts/test.pdf')
      expect(queueService.removeJob).toHaveBeenCalledWith('job-123')
      expect(prisma.manuscript.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
    })

    it('should continue deletion even if GCS cleanup fails', async () => {
      const mockManuscript = {
        id: 'test-id',
        pdfStoragePath: 'manuscripts/test.pdf',
        ocrJobId: null,
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(storageService.deletePdf as jest.Mock).mockRejectedValue(new Error('GCS error'))
      ;(prisma.manuscript.delete as jest.Mock).mockResolvedValue(mockManuscript)

      await manuscriptService.deleteManuscript('test-id')

      // Should still delete from database
      expect(prisma.manuscript.delete).toHaveBeenCalled()
    })
  })

  describe('convertToNovel', () => {
    it('should convert manuscript to novel', async () => {
      const mockManuscript = {
        id: 'manuscript-id',
        title: 'Test Novel',
        language: 'en',
        ocrStatus: OcrStatus.COMPLETED,
        extractedWords: {
          line1Words: ['the', 'quick', 'brown'],
          line2Words: ['fox', 'jumps', 'over'],
          line3Words: ['the', 'lazy', 'dog'],
        },
        convertedToNovelId: null,
      }

      const mockNovel = {
        id: 'novel-id',
        title: 'Test Novel',
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(prisma.novel.create as jest.Mock).mockResolvedValue(mockNovel)
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue({
        ...mockManuscript,
        convertedToNovelId: 'novel-id',
      })

      const result = await manuscriptService.convertToNovel(
        'manuscript-id',
        {
          url: 'https://example.com/novel',
          chapter: 'Chapter 1',
          pageNumber: 1,
        },
        'admin@example.com'
      )

      expect(prisma.novel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Novel',
          line1: 'the quick brown',
          line2: 'fox jumps over',
          line3: 'the lazy dog',
          url: 'https://example.com/novel',
          language: 'en',
        }),
      })

      expect(result.novel.id).toBe('novel-id')
    })

    it('should throw error if manuscript already converted', async () => {
      const mockManuscript = {
        id: 'manuscript-id',
        convertedToNovelId: 'existing-novel-id',
        ocrStatus: OcrStatus.COMPLETED,
        extractedWords: {},
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)

      await expect(
        manuscriptService.convertToNovel('manuscript-id', { url: 'test' }, 'admin@example.com')
      ).rejects.toThrow('already converted')
    })

    it('should throw error if OCR not completed', async () => {
      const mockManuscript = {
        id: 'manuscript-id',
        convertedToNovelId: null,
        ocrStatus: OcrStatus.PENDING,
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)

      await expect(
        manuscriptService.convertToNovel('manuscript-id', { url: 'test' }, 'admin@example.com')
      ).rejects.toThrow('OCR must be completed')
    })

    it('should throw error if no extracted words', async () => {
      const mockManuscript = {
        id: 'manuscript-id',
        convertedToNovelId: null,
        ocrStatus: OcrStatus.COMPLETED,
        extractedWords: null,
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)

      await expect(
        manuscriptService.convertToNovel('manuscript-id', { url: 'test' }, 'admin@example.com')
      ).rejects.toThrow('No extracted words')
    })
  })

  describe('reprocessManuscript', () => {
    it('should reprocess manuscript', async () => {
      const mockManuscript = {
        id: 'test-id',
        pdfStoragePath: 'manuscripts/test.pdf',
        language: 'en',
        orientationHint: null,
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(storageService.fileExists as jest.Mock).mockResolvedValue(true)
      ;(prisma.manuscript.update as jest.Mock).mockResolvedValue(mockManuscript)
      ;(queueService.addOcrJob as jest.Mock).mockResolvedValue('new-job-123')

      const jobId = await manuscriptService.reprocessManuscript('test-id')

      expect(storageService.fileExists).toHaveBeenCalledWith('manuscripts/test.pdf')
      expect(prisma.manuscript.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          ocrStatus: OcrStatus.PENDING,
          ocrErrorMessage: null,
        }),
      })
      expect(queueService.addOcrJob).toHaveBeenCalled()
      expect(jobId).toBe('new-job-123')
    })

    it('should throw error if file no longer exists', async () => {
      const mockManuscript = {
        id: 'test-id',
        pdfStoragePath: 'manuscripts/test.pdf',
      }

      ;(prisma.manuscript.findUnique as jest.Mock).mockResolvedValue(mockManuscript)
      ;(storageService.fileExists as jest.Mock).mockResolvedValue(false)

      await expect(manuscriptService.reprocessManuscript('test-id')).rejects.toThrow(
        'PDF file no longer exists'
      )
    })
  })
})
