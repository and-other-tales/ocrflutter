import { fileValidationService } from '../file-validation.service'
import { OcrErrorCodes } from '../../utils/errors'

describe('FileValidationService', () => {
  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      const result = fileValidationService.sanitizeFilename('test file (1).pdf')
      expect(result).toBe('test_file__1_.pdf')
    })

    it('should remove path traversal attempts', () => {
      const result = fileValidationService.sanitizeFilename('../../../etc/passwd.pdf')
      expect(result).toBe('___etc_passwd.pdf')
    })

    it('should add .pdf extension if missing', () => {
      const result = fileValidationService.sanitizeFilename('document')
      expect(result).toBe('document.pdf')
    })

    it('should limit filename length to 255 characters', () => {
      const longName = 'a'.repeat(300)
      const result = fileValidationService.sanitizeFilename(longName)
      expect(result.length).toBe(255)
      expect(result.endsWith('.pdf')).toBe(true)
    })

    it('should handle filenames with multiple dots', () => {
      const result = fileValidationService.sanitizeFilename('my.novel.v2.pdf')
      expect(result).toBe('my.novel.v2.pdf')
    })
  })

  describe('validateMetadata', () => {
    it('should validate correct metadata', () => {
      const result = fileValidationService.validateMetadata({
        title: 'Test Novel',
        author: 'John Doe',
        language: 'en',
      })
      expect(result.valid).toBe(true)
    })

    it('should reject empty title', () => {
      const result = fileValidationService.validateMetadata({
        title: '',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Title is required')
    })

    it('should reject title over 500 characters', () => {
      const result = fileValidationService.validateMetadata({
        title: 'a'.repeat(501),
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('500 characters')
    })

    it('should reject author name over 300 characters', () => {
      const result = fileValidationService.validateMetadata({
        title: 'Valid Title',
        author: 'a'.repeat(301),
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('300 characters')
    })

    it('should reject invalid language code', () => {
      const result = fileValidationService.validateMetadata({
        title: 'Valid Title',
        language: 'english',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid language code')
    })

    it('should accept valid language codes', () => {
      const validCodes = ['en', 'ja', 'sv', 'fr', 'de', 'es', 'it']
      validCodes.forEach((code) => {
        const result = fileValidationService.validateMetadata({
          title: 'Valid Title',
          language: code,
        })
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('validatePdfFile', () => {
    it('should reject empty file', async () => {
      const emptyBuffer = Buffer.from([])
      const result = await fileValidationService.validatePdfFile(emptyBuffer, 'test.pdf')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
      expect(result.errorCode).toBe(OcrErrorCodes.INVALID_FILE_TYPE)
    })

    it('should reject non-PDF files', async () => {
      // Create a simple text file buffer
      const textBuffer = Buffer.from('This is not a PDF')
      const result = await fileValidationService.validatePdfFile(textBuffer, 'test.txt')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(OcrErrorCodes.INVALID_FILE_TYPE)
    })

    it('should accept valid PDF file', async () => {
      // Minimal valid PDF structure
      const pdfBuffer = Buffer.from(
        '%PDF-1.4\n' +
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
        'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000114 00000 n\n' +
        'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n199\n%%EOF'
      )

      const result = await fileValidationService.validatePdfFile(pdfBuffer, 'test.pdf')

      expect(result.valid).toBe(true)
      expect(result.mimeType).toBe('application/pdf')
      expect(result.fileSize).toBe(pdfBuffer.length)
    })

    it('should reject files exceeding size limit', async () => {
      // Mock a file that's too large (51 MB)
      const largeSize = 51 * 1024 * 1024
      const largeBuffer = Buffer.alloc(largeSize)
      // Add PDF header to pass type check
      largeBuffer.write('%PDF-1.4')

      const result = await fileValidationService.validatePdfFile(largeBuffer, 'large.pdf')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(OcrErrorCodes.FILE_TOO_LARGE)
      expect(result.error).toContain('50MB')
    })

    it('should detect invalid PDF header', async () => {
      const invalidPdfBuffer = Buffer.from('NOT-PDF-1.4\nsome content\n%%EOF')
      const result = await fileValidationService.validatePdfFile(invalidPdfBuffer, 'invalid.pdf')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(OcrErrorCodes.INVALID_FILE_TYPE)
    })

    it('should detect corrupted PDF (missing EOF)', async () => {
      const corruptedPdfBuffer = Buffer.from(
        '%PDF-1.4\n' +
        '1 0 obj\n<< /Type /Catalog >>\nendobj\n' +
        'xref\n0 1\n' +
        'trailer\n<< /Size 1 >>\n'
        // Missing %%EOF
      )

      const result = await fileValidationService.validatePdfFile(corruptedPdfBuffer, 'corrupted.pdf')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(OcrErrorCodes.CORRUPTED_FILE)
    })

    it('should detect encrypted PDF', async () => {
      const encryptedPdfBuffer = Buffer.from(
        '%PDF-1.4\n' +
        '1 0 obj\n<< /Type /Catalog /Encrypt 5 0 R >>\nendobj\n' +
        '5 0 obj\n<< /Filter /Standard >>\nendobj\n' +
        'xref\ntrailer\n%%EOF'
      )

      const result = await fileValidationService.validatePdfFile(encryptedPdfBuffer, 'encrypted.pdf')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(OcrErrorCodes.ENCRYPTED_PDF)
      expect(result.error).toContain('password-protected')
    })
  })

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ntest content\n%%EOF')
      const info = await fileValidationService.getFileInfo(pdfBuffer)

      expect(info.size).toBe(pdfBuffer.length)
      expect(info.mimeType).toBe('application/pdf')
      expect(info.extension).toBe('pdf')
    })

    it('should handle non-PDF files', async () => {
      const textBuffer = Buffer.from('plain text')
      const info = await fileValidationService.getFileInfo(textBuffer)

      expect(info.size).toBe(textBuffer.length)
      // file-type returns undefined for plain text
      expect(info.mimeType).toBeUndefined()
    })
  })
})
