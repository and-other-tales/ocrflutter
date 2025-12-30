export const ocrConfig = {
  google: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    bucketName: process.env.GCS_BUCKET_NAME || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  upload: {
    maxSizeMb: parseInt(process.env.PDF_MAX_SIZE_MB || '50'),
    maxSizeBytes: parseInt(process.env.PDF_MAX_SIZE_MB || '50') * 1024 * 1024,
    allowedMimeTypes: ['application/pdf'],
  },
  ocr: {
    confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '70'),
    maxRetries: parseInt(process.env.OCR_MAX_RETRIES || '3'),
    timeoutSeconds: parseInt(process.env.OCR_TIMEOUT_SECONDS || '55'),
  },
  worker: {
    concurrency: (() => {
      const n = parseInt(process.env.WORKER_CONCURRENCY || '5', 10)
      return Number.isFinite(n) && n > 0 ? n : 5
    })(),
    rateLimitMax: parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10'),
    rateLimitDuration: parseInt(process.env.WORKER_RATE_LIMIT_DURATION || '1000'),
  },
  malwareScan: {
    enabled: process.env.ENABLE_MALWARE_SCAN === 'true',
    host: process.env.CLAMAV_HOST || 'localhost',
    port: parseInt(process.env.CLAMAV_PORT || '3310'),
  },
}

// Validate required environment variables
export function validateOcrConfig() {
  const errors: string[] = []

  if (!ocrConfig.google.projectId) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID is required')
  }

  if (!ocrConfig.google.bucketName) {
    errors.push('GCS_BUCKET_NAME is required')
  }

  if (errors.length > 0) {
    console.warn('OCR configuration warnings:', errors.join(', '))
  }

  return errors.length === 0
}
