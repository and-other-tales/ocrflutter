export class OcrError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.name = 'OcrError'
  }
}

export const OcrErrorCodes = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  ENCRYPTED_PDF: 'ENCRYPTED_PDF',
  NO_TEXT_EXTRACTED: 'NO_TEXT_EXTRACTED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  MALWARE_DETECTED: 'MALWARE_DETECTED',
  INVALID_PDF: 'INVALID_PDF',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  GCS_ERROR: 'GCS_ERROR',
  VISION_API_ERROR: 'VISION_API_ERROR',
  QUEUE_ERROR: 'QUEUE_ERROR',
}
