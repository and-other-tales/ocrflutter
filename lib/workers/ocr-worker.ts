import { Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { ocrConfig } from '../config/ocr.config'
import { storageService } from '../services/storage.service'
import { ocrService } from '../services/ocr.service'
import { manuscriptService } from '../services/manuscript.service'
import { OcrJobData, OcrJobResult } from '../services/queue.service'
import { OcrStatus } from '@prisma/client'

export class OcrWorker {
  private worker: Worker<OcrJobData, OcrJobResult>
  private redisConnection: Redis

  constructor() {
    // Create Redis connection for worker
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

    // Initialize worker
    this.worker = new Worker<OcrJobData, OcrJobResult>(
      'ocr-processing',
      async (job: Job<OcrJobData, OcrJobResult>) => {
        return await this.processOcrJob(job)
      },
      {
        connection: this.redisConnection,
        concurrency: ocrConfig.worker.concurrency,
        limiter: {
          max: ocrConfig.worker.rateLimitMax,
          duration: ocrConfig.worker.rateLimitDuration,
        },
      }
    )

    // Set up event listeners
    this.setupEventListeners()

    console.log('[OCR Worker] Started with concurrency:', ocrConfig.worker.concurrency)
  }

  /**
   * Process an OCR job
   */
  private async processOcrJob(job: Job<OcrJobData, OcrJobResult>): Promise<OcrJobResult> {
    const { manuscriptId, pdfStoragePath, language, orientationHint } = job.data

    console.log(`[OCR Worker] Processing job ${job.id} for manuscript ${manuscriptId}`)

    try {
      // Update manuscript status to PROCESSING
      await manuscriptService.updateOcrStatus(manuscriptId, OcrStatus.PROCESSING)

      // Report progress
      await job.updateProgress(10)

      // Download PDF from GCS
      console.log(`[OCR Worker] Downloading PDF from ${pdfStoragePath}`)
      const pdfBuffer = await storageService.getPdfBuffer(pdfStoragePath)

      await job.updateProgress(30)

      // Run OCR
      console.log(`[OCR Worker] Running OCR for manuscript ${manuscriptId}`)
      const extractedWords = await ocrService.extractTextFromPdf(
        pdfBuffer,
        orientationHint
      )

      await job.updateProgress(80)

      // Determine status based on confidence
      const confidence = extractedWords.confidence
      const confidenceThreshold = ocrConfig.ocr.confidenceThreshold

      let status: OcrStatus
      if (confidence >= confidenceThreshold) {
        status = OcrStatus.COMPLETED
      } else {
        status = OcrStatus.LOW_CONFIDENCE
        console.warn(
          `[OCR Worker] Low confidence (${confidence}%) for manuscript ${manuscriptId}`
        )
      }

      // Update manuscript with results
      await manuscriptService.updateOcrStatus(manuscriptId, status, {
        extractedWords,
        confidence,
        textOrientation: extractedWords.orientation as any,
      })

      await job.updateProgress(100)

      console.log(
        `[OCR Worker] Successfully processed manuscript ${manuscriptId} with status ${status}`
      )

      return {
        manuscriptId,
        success: true,
        extractedWords,
        confidence,
      }
    } catch (error: any) {
      console.error(`[OCR Worker] Error processing manuscript ${manuscriptId}:`, error)

      // Increment retry count
      const retryCount = await manuscriptService.incrementRetryCount(manuscriptId)

      // Check if we've exhausted retries
      const maxRetries = ocrConfig.ocr.maxRetries
      if (retryCount >= maxRetries) {
        // Mark as FAILED after max retries
        await manuscriptService.updateOcrStatus(manuscriptId, OcrStatus.FAILED, {
          errorMessage: `OCR failed after ${maxRetries} attempts: ${error.message}`,
        })

        console.error(
          `[OCR Worker] Manuscript ${manuscriptId} failed after ${maxRetries} attempts`
        )
      } else {
        console.log(
          `[OCR Worker] Manuscript ${manuscriptId} will be retried (attempt ${retryCount}/${maxRetries})`
        )
      }

      // Throw error to trigger BullMQ retry
      throw error
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job: Job<OcrJobData, OcrJobResult>) => {
      console.log(`[OCR Worker] Job ${job.id} completed successfully`)
    })

    this.worker.on('failed', (job: Job<OcrJobData, OcrJobResult> | undefined, error: Error) => {
      if (job) {
        console.error(`[OCR Worker] Job ${job.id} failed:`, error.message)
      } else {
        console.error('[OCR Worker] Job failed:', error.message)
      }
    })

    this.worker.on('error', (error: Error) => {
      console.error('[OCR Worker] Worker error:', error)
    })

    this.worker.on('stalled', (jobId: string) => {
      console.warn(`[OCR Worker] Job ${jobId} stalled`)
    })

    this.worker.on('active', (job: Job<OcrJobData, OcrJobResult>) => {
      console.log(`[OCR Worker] Job ${job.id} started processing`)
    })
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[OCR Worker] Shutting down...')

    try {
      await this.worker.close()
      await this.redisConnection.quit()
      console.log('[OCR Worker] Shutdown complete')
    } catch (error) {
      console.error('[OCR Worker] Error during shutdown:', error)
    }
  }

  /**
   * Get worker instance
   */
  getWorker(): Worker<OcrJobData, OcrJobResult> {
    return this.worker
  }
}

// Handle process termination
let worker: OcrWorker | null = null

export function startWorker(): OcrWorker {
  if (worker) {
    return worker
  }

  worker = new OcrWorker()

  // Graceful shutdown on signals
  process.on('SIGTERM', async () => {
    console.log('[OCR Worker] Received SIGTERM signal')
    if (worker) {
      await worker.shutdown()
      process.exit(0)
    }
  })

  process.on('SIGINT', async () => {
    console.log('[OCR Worker] Received SIGINT signal')
    if (worker) {
      await worker.shutdown()
      process.exit(0)
    }
  })

  return worker
}

export default OcrWorker
