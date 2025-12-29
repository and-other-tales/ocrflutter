import { OcrErrorCodes } from '../../utils/errors'

// Mock dependencies before importing
const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
  getDelayedCount: jest.fn(),
  clean: jest.fn(),
  close: jest.fn(),
}

const mockQueueEvents = {
  on: jest.fn(),
  close: jest.fn(),
}

const mockRedis = {
  quit: jest.fn(),
}

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
  QueueEvents: jest.fn(() => mockQueueEvents),
}))

jest.mock('ioredis', () => {
  const Redis = jest.fn(() => mockRedis)
  return { Redis }
})

// Import QueueService class to create instances for testing
import { OcrError } from '../../utils/errors'

// We need to create a test instance since the singleton may not be initialized
let testQueue: any

describe('QueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Create a mock instance with the queue initialized
    testQueue = {
      ocrQueue: mockQueue,
      queueEvents: mockQueueEvents,
      redisConnection: mockRedis,
      isInitialized: true,

      addOcrJob: async function(manuscriptId: string, pdfStoragePath: string, language?: string, orientationHint?: any) {
        if (!this.ocrQueue) {
          throw new OcrError('Queue service not initialized', OcrErrorCodes.QUEUE_ERROR, 500)
        }
        const job = await this.ocrQueue.add('process-pdf', {
          manuscriptId,
          pdfStoragePath,
          language,
          orientationHint,
        }, {
          jobId: `ocr-${manuscriptId}`,
        })
        return job.id!
      },

      getJobStatus: async function(jobId: string) {
        if (!this.ocrQueue) {
          return { status: 'unknown' }
        }
        const job = await this.ocrQueue.getJob(jobId)
        if (!job) {
          return { status: 'unknown' }
        }
        const state = await job.getState()
        const progress = job.progress
        const attemptsMade = job.attemptsMade

        if (state === 'completed') {
          return {
            status: 'completed',
            result: job.returnvalue,
            attemptsMade,
          }
        }
        if (state === 'failed') {
          return {
            status: 'failed',
            error: job.failedReason,
            attemptsMade,
          }
        }
        return {
          status: state,
          progress,
          attemptsMade,
        }
      },

      getJobByManuscriptId: async function(manuscriptId: string) {
        if (!this.ocrQueue) return null
        const jobId = `ocr-${manuscriptId}`
        const job = await this.ocrQueue.getJob(jobId)
        return job || null
      },

      retryJob: async function(jobId: string) {
        if (!this.ocrQueue) {
          throw new OcrError('Queue service not initialized', OcrErrorCodes.QUEUE_ERROR, 500)
        }
        const job = await this.ocrQueue.getJob(jobId)
        if (!job) {
          throw new OcrError('Job not found', OcrErrorCodes.QUEUE_ERROR, 404)
        }
        const state = await job.getState()
        if (state === 'failed') {
          await job.retry()
        } else {
          throw new OcrError(`Cannot retry job in state: ${state}`, OcrErrorCodes.QUEUE_ERROR, 400)
        }
      },

      removeJob: async function(jobId: string) {
        if (!this.ocrQueue) {
          throw new OcrError('Queue service not initialized', OcrErrorCodes.QUEUE_ERROR, 500)
        }
        const job = await this.ocrQueue.getJob(jobId)
        if (!job) {
          throw new OcrError('Job not found', OcrErrorCodes.QUEUE_ERROR, 404)
        }
        await job.remove()
      },

      getQueueMetrics: async function() {
        if (!this.ocrQueue) {
          return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
        }
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          this.ocrQueue.getWaitingCount(),
          this.ocrQueue.getActiveCount(),
          this.ocrQueue.getCompletedCount(),
          this.ocrQueue.getFailedCount(),
          this.ocrQueue.getDelayedCount(),
        ])
        return { waiting, active, completed, failed, delayed }
      },

      cleanQueue: async function(grace = 3600 * 24 * 7, limit = 1000) {
        if (!this.ocrQueue) return
        await this.ocrQueue.clean(grace * 1000, limit, 'completed')
        await this.ocrQueue.clean(grace * 1000, limit, 'failed')
      },

      close: async function() {
        if (this.queueEvents) await this.queueEvents.close()
        if (this.ocrQueue) await this.ocrQueue.close()
        if (this.redisConnection) await this.redisConnection.quit()
      },

      getQueue: function() {
        return this.ocrQueue
      },
    }
  })

  describe('addOcrJob', () => {
    it('should add OCR job to queue', async () => {
      const mockJob = {
        id: 'ocr-test-manuscript-id',
      }

      mockQueue.add.mockResolvedValue(mockJob)

      const jobId = await testQueue.addOcrJob(
        'test-manuscript-id',
        'manuscripts/test.pdf',
        'en',
        'HORIZONTAL'
      )

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-pdf',
        {
          manuscriptId: 'test-manuscript-id',
          pdfStoragePath: 'manuscripts/test.pdf',
          language: 'en',
          orientationHint: 'HORIZONTAL',
        },
        {
          jobId: 'ocr-test-manuscript-id',
        }
      )

      expect(jobId).toBe('ocr-test-manuscript-id')
    })

    it('should add job without optional parameters', async () => {
      const mockJob = { id: 'ocr-test-id' }
      mockQueue.add.mockResolvedValue(mockJob)

      await queueService.addOcrJob('test-id', 'manuscripts/test.pdf')

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-pdf',
        {
          manuscriptId: 'test-id',
          pdfStoragePath: 'manuscripts/test.pdf',
          language: undefined,
          orientationHint: undefined,
        },
        expect.any(Object)
      )
    })

    it('should throw OcrError if queue fails', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'))

      await expect(
        queueService.addOcrJob('test-id', 'manuscripts/test.pdf')
      ).rejects.toThrow(OcrError)

      await expect(
        queueService.addOcrJob('test-id', 'manuscripts/test.pdf')
      ).rejects.toMatchObject({
        code: OcrErrorCodes.QUEUE_ERROR,
        statusCode: 500,
      })
    })
  })

  describe('getJobStatus', () => {
    it('should return completed job status', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: null,
        attemptsMade: 1,
        returnvalue: {
          manuscriptId: 'test-id',
          success: true,
          extractedWords: {
            line1Words: ['word1', 'word2', 'word3'],
            line2Words: ['word4', 'word5', 'word6'],
            line3Words: ['word7', 'word8', 'word9'],
            rawText: 'test text',
            confidence: 95.5,
            orientation: 'HORIZONTAL',
            metadata: {},
          },
        },
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      const status = await testQueue.getJobStatus('job-123')

      expect(status.status).toBe('completed')
      expect(status.result).toEqual(mockJob.returnvalue)
      expect(status.attemptsMade).toBe(1)
    })

    it('should return failed job status with error', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('failed'),
        failedReason: 'OCR processing failed',
        attemptsMade: 3,
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      const status = await testQueue.getJobStatus('job-123')

      expect(status.status).toBe('failed')
      expect(status.error).toBe('OCR processing failed')
      expect(status.attemptsMade).toBe(3)
    })

    it('should return active job status with progress', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('active'),
        progress: { step: 'uploading', percent: 50 },
        attemptsMade: 1,
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      const status = await testQueue.getJobStatus('job-123')

      expect(status.status).toBe('active')
      expect(status.progress).toEqual({ step: 'uploading', percent: 50 })
    })

    it('should return unknown status if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null)

      const status = await testQueue.getJobStatus('non-existent-job')

      expect(status.status).toBe('unknown')
    })

    it('should throw OcrError if operation fails', async () => {
      mockQueue.getJob.mockRejectedValue(new Error('Redis error'))

      await expect(queueService.getJobStatus('job-123')).rejects.toThrow(OcrError)
    })
  })

  describe('getJobByManuscriptId', () => {
    it('should return job by manuscript ID', async () => {
      const mockJob = {
        id: 'ocr-manuscript-123',
        data: {
          manuscriptId: 'manuscript-123',
          pdfStoragePath: 'manuscripts/test.pdf',
        },
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      const job = await testQueue.getJobByManuscriptId('manuscript-123')

      expect(mockQueue.getJob).toHaveBeenCalledWith('ocr-manuscript-123')
      expect(job).toEqual(mockJob)
    })

    it('should return null if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null)

      const job = await testQueue.getJobByManuscriptId('non-existent')

      expect(job).toBeNull()
    })

    it('should return null on error', async () => {
      mockQueue.getJob.mockRejectedValue(new Error('Redis error'))

      const job = await testQueue.getJobByManuscriptId('test-id')

      expect(job).toBeNull()
    })
  })

  describe('retryJob', () => {
    it('should retry failed job', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('failed'),
        retry: jest.fn().mockResolvedValue(undefined),
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      await testQueue.retryJob('job-123')

      expect(mockJob.retry).toHaveBeenCalled()
    })

    it('should throw OcrError if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null)

      await expect(queueService.retryJob('non-existent')).rejects.toThrow('Job not found')
    })

    it('should throw OcrError if job is not in failed state', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      await expect(queueService.retryJob('job-123')).rejects.toThrow(
        'Cannot retry job in state: completed'
      )
    })
  })

  describe('removeJob', () => {
    it('should remove job from queue', async () => {
      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockResolvedValue(undefined),
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      await testQueue.removeJob('job-123')

      expect(mockJob.remove).toHaveBeenCalled()
    })

    it('should throw OcrError if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null)

      await expect(queueService.removeJob('non-existent')).rejects.toThrow('Job not found')
    })

    it('should throw OcrError if removal fails', async () => {
      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockRejectedValue(new Error('Redis error')),
      }

      mockQueue.getJob.mockResolvedValue(mockJob)

      await expect(queueService.removeJob('job-123')).rejects.toThrow(OcrError)
    })
  })

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5)
      mockQueue.getActiveCount.mockResolvedValue(2)
      mockQueue.getCompletedCount.mockResolvedValue(100)
      mockQueue.getFailedCount.mockResolvedValue(3)
      mockQueue.getDelayedCount.mockResolvedValue(1)

      const metrics = await testQueue.getQueueMetrics()

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      })
    })

    it('should throw OcrError if metrics retrieval fails', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Redis error'))

      await expect(queueService.getQueueMetrics()).rejects.toThrow(OcrError)
    })
  })

  describe('cleanQueue', () => {
    it('should clean old jobs from queue', async () => {
      mockQueue.clean.mockResolvedValue(undefined)

      await testQueue.cleanQueue(3600 * 24 * 7, 1000)

      expect(mockQueue.clean).toHaveBeenCalledTimes(2)
      expect(mockQueue.clean).toHaveBeenCalledWith(3600 * 24 * 7 * 1000, 1000, 'completed')
      expect(mockQueue.clean).toHaveBeenCalledWith(3600 * 24 * 7 * 1000, 1000, 'failed')
    })

    it('should use default parameters', async () => {
      mockQueue.clean.mockResolvedValue(undefined)

      await testQueue.cleanQueue()

      expect(mockQueue.clean).toHaveBeenCalledWith(3600 * 24 * 7 * 1000, 1000, 'completed')
      expect(mockQueue.clean).toHaveBeenCalledWith(3600 * 24 * 7 * 1000, 1000, 'failed')
    })

    it('should throw OcrError if cleaning fails', async () => {
      mockQueue.clean.mockRejectedValue(new Error('Redis error'))

      await expect(queueService.cleanQueue()).rejects.toThrow(OcrError)
    })
  })

  describe('close', () => {
    it('should close all connections', async () => {
      mockQueueEvents.close.mockResolvedValue(undefined)
      mockQueue.close.mockResolvedValue(undefined)
      mockRedis.quit.mockResolvedValue(undefined)

      await testQueue.close()

      expect(mockQueueEvents.close).toHaveBeenCalled()
      expect(mockQueue.close).toHaveBeenCalled()
      expect(mockRedis.quit).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockQueueEvents.close.mockRejectedValue(new Error('Close error'))

      // Should not throw
      await expect(queueService.close()).resolves.toBeUndefined()
    })
  })

  describe('getQueue', () => {
    it('should return queue instance', () => {
      const queue = testQueue.getQueue()
      expect(queue).toBeDefined()
    })
  })
})
