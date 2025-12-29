import { OcrError, OcrErrorCodes } from '../errors'

describe('OcrError', () => {
  it('should create error with all properties', () => {
    const error = new OcrError('Test error message', OcrErrorCodes.FILE_TOO_LARGE, 413)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(OcrError)
    expect(error.message).toBe('Test error message')
    expect(error.code).toBe(OcrErrorCodes.FILE_TOO_LARGE)
    expect(error.statusCode).toBe(413)
    expect(error.name).toBe('OcrError')
  })

  it('should default statusCode to 500', () => {
    const error = new OcrError('Test error', OcrErrorCodes.GCS_ERROR)

    expect(error.statusCode).toBe(500)
  })

  it('should be throwable', () => {
    expect(() => {
      throw new OcrError('Test error', OcrErrorCodes.INVALID_FILE_TYPE, 400)
    }).toThrow(OcrError)

    expect(() => {
      throw new OcrError('Test error', OcrErrorCodes.INVALID_FILE_TYPE, 400)
    }).toThrow('Test error')
  })

  it('should be catchable as Error', () => {
    try {
      throw new OcrError('Test error', OcrErrorCodes.QUEUE_ERROR, 500)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(OcrError)
    }
  })

  it('should preserve stack trace', () => {
    const error = new OcrError('Test error', OcrErrorCodes.VISION_API_ERROR, 503)

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('OcrError')
  })
})

describe('OcrErrorCodes', () => {
  it('should have all required error codes', () => {
    expect(OcrErrorCodes.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE')
    expect(OcrErrorCodes.INVALID_FILE_TYPE).toBe('INVALID_FILE_TYPE')
    expect(OcrErrorCodes.ENCRYPTED_PDF).toBe('ENCRYPTED_PDF')
    expect(OcrErrorCodes.NO_TEXT_EXTRACTED).toBe('NO_TEXT_EXTRACTED')
    expect(OcrErrorCodes.LOW_CONFIDENCE).toBe('LOW_CONFIDENCE')
    expect(OcrErrorCodes.PROCESSING_TIMEOUT).toBe('PROCESSING_TIMEOUT')
    expect(OcrErrorCodes.UPLOAD_FAILED).toBe('UPLOAD_FAILED')
    expect(OcrErrorCodes.MALWARE_DETECTED).toBe('MALWARE_DETECTED')
    expect(OcrErrorCodes.INVALID_PDF).toBe('INVALID_PDF')
    expect(OcrErrorCodes.CORRUPTED_FILE).toBe('CORRUPTED_FILE')
    expect(OcrErrorCodes.GCS_ERROR).toBe('GCS_ERROR')
    expect(OcrErrorCodes.VISION_API_ERROR).toBe('VISION_API_ERROR')
    expect(OcrErrorCodes.QUEUE_ERROR).toBe('QUEUE_ERROR')
  })

  it('should be string constants', () => {
    const originalValue = OcrErrorCodes.FILE_TOO_LARGE

    expect(typeof OcrErrorCodes.FILE_TOO_LARGE).toBe('string')
    expect(OcrErrorCodes.FILE_TOO_LARGE).toBe(originalValue)
  })
})
