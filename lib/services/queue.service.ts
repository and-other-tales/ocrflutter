import { Queue, QueueEvents, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { ocrConfig } from '../config/ocr.config'
import { OcrError, OcrErrorCodes } from '../utils/errors'

export interface OcrJobData {
  manuscriptId: string
  pdfStoragePath: string
  language?: string
  orientationHint?: 'HORIZONTAL' | 'VERTICAL_TATEGAKI'
}

export interface OcrJobResult {
  manuscriptId: string
  success: boolean
  extractedWords?: {
    line1Words: string[]
    line2Words: string[]
    line3Words: string[]
    rawText: string
    confidence: number
    orientation: string
    metadata: any
  }
  error?: string
  confidence?: number
}

class QueueService {
  private ocrQueue: Queue<OcrJobData, OcrJobResult> | null = null
  private queueEvents: QueueEvents | null = null
  private redisConnection: Redis | null = null
  private isInitialized = false

  constructor() {
    // Skip initialization during build time or if Redis URL is not set
    if (process.env.NEXT_PHASE === 'phase-production-build' || !ocrConfig.redis.url) {
      console.log('[Queue] Skipping initialization (build time or no Redis config)')
      return
    }
    this.initialize()
  }

  private initialize() {
    if (this.isInitialized) return

    try {
      // Create Redis connection
      this.redisConnection = new Redis({
        host: ocrConfig.redis.host,
        port: ocrConfig.redis.port,
        password: ocrConfig.redis.password,
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      })

      // Initialize OCR queue
      this.ocrQueue = new Queue<OcrJobData, OcrJobResult>('ocr-processing', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: ocrConfig.ocr.maxRetries,
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 seconds
          },
          removeOnComplete: {
            age: 3600 * 24, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 3600 * 24 * 7, // Keep failed jobs for 7 days
          },
        },
      })

      // Initialize queue events for monitoring
      this.queueEvents = new QueueEvents('ocr-processing', {
        connection: this.redisConnection,
      })

      // Set up event listeners
      this.setupEventListeners()

      this.isInitialized = true
    } catch (error) {
      console.error('[Queue] Initialization error:', error)
      // Don't throw during build time
    }
  }

  /**
   * Set up event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    if (!this.queueEvents) return

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(`[Queue] Job ${jobId} completed:`, returnvalue)
    })

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`[Queue] Job ${jobId} failed:`, failedReason)
    })

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`[Queue] Job ${jobId} progress:`, data)
    })
  }

  /**
   * Add an OCR job to the queue
   */
  async addOcrJob(
    manuscriptId: string,
    pdfStoragePath: string,
    language?: string,
    orientationHint?: 'HORIZONTAL' | 'VERTICAL_TATEGAKI'
  ): Promise<string> {
    if (!this.ocrQueue) {
      throw new OcrError('Queue service not initialized', OcrErrorCodes.QUEUE_ERROR, 500)
    }

    try {
      const job = await this.ocrQueue.add(
        'process-pdf',
        {
          manuscriptId,
          pdfStoragePath,
          language,
          orientationHint,
        },
        {
          jobId: `ocr-${manuscriptId}`, // Use manuscript ID as job ID for easy lookup
        }
      )

      console.log(`[Queue] Added OCR job ${job.id} for manuscript ${manuscriptId}`)
      return job.id!
    } catch (error: any) {
      console.error('[Queue] Failed to add job:', error)
      throw new OcrError(
        `Failed to queue OCR job: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Get job status by job ID
   */
  async getJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown'
    progress?: any
    result?: OcrJobResult
    error?: string
    attemptsMade?: number
  }> {
    try {
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
        status: state as any,
        progress,
        attemptsMade,
      }
    } catch (error: any) {
      console.error('[Queue] Failed to get job status:', error)
      throw new OcrError(
        `Failed to get job status: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Get job by manuscript ID
   */
  async getJobByManuscriptId(manuscriptId: string): Promise<Job<OcrJobData, OcrJobResult> | undefined | null> {
    try {
      const jobId = `ocr-${manuscriptId}`
      const job = await this.ocrQueue.getJob(jobId)
      return job || null
    } catch (error: any) {
      console.error('[Queue] Failed to get job by manuscript ID:', error)
      return null
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const job = await this.ocrQueue.getJob(jobId)

      if (!job) {
        throw new OcrError('Job not found', OcrErrorCodes.QUEUE_ERROR, 404)
      }

      const state = await job.getState()

      if (state === 'failed') {
        await job.retry()
        console.log(`[Queue] Retrying job ${jobId}`)
      } else {
        throw new OcrError(
          `Cannot retry job in state: ${state}`,
          OcrErrorCodes.QUEUE_ERROR,
          400
        )
      }
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Queue] Failed to retry job:', error)
      throw new OcrError(
        `Failed to retry job: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.ocrQueue.getJob(jobId)

      if (!job) {
        throw new OcrError('Job not found', OcrErrorCodes.QUEUE_ERROR, 404)
      }

      await job.remove()
      console.log(`[Queue] Removed job ${jobId}`)
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('[Queue] Failed to remove job:', error)
      throw new OcrError(
        `Failed to remove job: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.ocrQueue.getWaitingCount(),
        this.ocrQueue.getActiveCount(),
        this.ocrQueue.getCompletedCount(),
        this.ocrQueue.getFailedCount(),
        this.ocrQueue.getDelayedCount(),
      ])

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
      }
    } catch (error: any) {
      console.error('[Queue] Failed to get queue metrics:', error)
      throw new OcrError(
        `Failed to get queue metrics: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanQueue(
    grace: number = 3600 * 24 * 7, // 7 days
    limit: number = 1000
  ): Promise<void> {
    try {
      await this.ocrQueue.clean(grace * 1000, limit, 'completed')
      await this.ocrQueue.clean(grace * 1000, limit, 'failed')
      console.log(`[Queue] Cleaned old jobs (grace: ${grace}s, limit: ${limit})`)
    } catch (error: any) {
      console.error('[Queue] Failed to clean queue:', error)
      throw new OcrError(
        `Failed to clean queue: ${error.message}`,
        OcrErrorCodes.QUEUE_ERROR,
        500
      )
    }
  }

  /**
   * Close queue connections (for graceful shutdown)
   */
  async close(): Promise<void> {
    try {
      await this.queueEvents.close()
      await this.ocrQueue.close()
      await this.redisConnection.quit()
      console.log('[Queue] Closed all connections')
    } catch (error: any) {
      console.error('[Queue] Failed to close connections:', error)
    }
  }

  /**
   * Get the queue instance (for worker)
   */
  getQueue(): Queue<OcrJobData, OcrJobResult> {
    return this.ocrQueue
  }
}

export const queueService = new QueueService()
