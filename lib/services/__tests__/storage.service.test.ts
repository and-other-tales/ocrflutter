import { OcrErrorCodes } from '../../utils/errors'

// Mock Google Cloud Storage
const mockFile = {
  save: jest.fn(),
  makePrivate: jest.fn(),
  getSignedUrl: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getMetadata: jest.fn(),
}

const mockBucket = {
  file: jest.fn(() => mockFile),
}

const mockStorage = {
  bucket: jest.fn(() => mockBucket),
}

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => mockStorage),
}))

// Import after mocking
import { storageService } from '../storage.service'
import { OcrError } from '../../utils/errors'

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadPdf', () => {
    it('should upload PDF to Google Cloud Storage', async () => {
      const mockBuffer = Buffer.from('test pdf content')
      mockFile.save.mockResolvedValue(undefined)
      mockFile.makePrivate.mockResolvedValue(undefined)

      const result = await storageService.uploadPdf(mockBuffer, 'test.pdf', {
        uploadedBy: 'test@example.com',
        title: 'Test Novel',
        author: 'John Doe',
        language: 'en',
      })

      expect(mockFile.save).toHaveBeenCalledWith(mockBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: expect.objectContaining({
            uploadedBy: 'test@example.com',
            title: 'Test Novel',
            author: 'John Doe',
            language: 'en',
            uploadedAt: expect.any(String),
          }),
        },
      })

      expect(mockFile.makePrivate).toHaveBeenCalled()
      expect(result.path).toMatch(/^manuscripts\/\d+-test\.pdf$/)
      expect(result.url).toContain('storage.googleapis.com')
    })

    it('should sanitize filename', async () => {
      mockFile.save.mockResolvedValue(undefined)
      mockFile.makePrivate.mockResolvedValue(undefined)

      const result = await storageService.uploadPdf(
        Buffer.from('test'),
        'my test file (1).pdf',
        {
          uploadedBy: 'test@example.com',
          title: 'Test',
        }
      )

      expect(result.path).toMatch(/manuscripts\/\d+-my_test_file__1_\.pdf/)
    })

    it('should throw OcrError on upload failure', async () => {
      mockFile.save.mockRejectedValue(new Error('GCS error'))

      await expect(
        storageService.uploadPdf(Buffer.from('test'), 'test.pdf', {
          uploadedBy: 'test@example.com',
          title: 'Test',
        })
      ).rejects.toThrow(OcrError)

      await expect(
        storageService.uploadPdf(Buffer.from('test'), 'test.pdf', {
          uploadedBy: 'test@example.com',
          title: 'Test',
        })
      ).rejects.toMatchObject({
        code: OcrErrorCodes.GCS_ERROR,
        statusCode: 500,
      })
    })

    it('should handle minimal metadata', async () => {
      mockFile.save.mockResolvedValue(undefined)
      mockFile.makePrivate.mockResolvedValue(undefined)

      await storageService.uploadPdf(Buffer.from('test'), 'test.pdf', {
        uploadedBy: 'test@example.com',
        title: 'Test',
      })

      expect(mockFile.save).toHaveBeenCalledWith(expect.any(Buffer), {
        metadata: {
          contentType: 'application/pdf',
          metadata: expect.objectContaining({
            uploadedBy: 'test@example.com',
            title: 'Test',
          }),
        },
      })
    })
  })

  describe('getSignedUrl', () => {
    it('should generate signed URL with default expiration', async () => {
      const mockUrl = 'https://storage.googleapis.com/bucket/file?signature=abc123'
      mockFile.getSignedUrl.mockResolvedValue([mockUrl])

      const url = await storageService.getSignedUrl('manuscripts/test.pdf')

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      })

      expect(url).toBe(mockUrl)
    })

    it('should generate signed URL with custom expiration', async () => {
      const mockUrl = 'https://storage.googleapis.com/bucket/file?signature=xyz789'
      mockFile.getSignedUrl.mockResolvedValue([mockUrl])

      const url = await storageService.getSignedUrl('manuscripts/test.pdf', 120)

      expect(mockFile.getSignedUrl).toHaveBeenCalled()
      expect(url).toBe(mockUrl)
    })

    it('should throw OcrError on signed URL generation failure', async () => {
      mockFile.getSignedUrl.mockRejectedValue(new Error('Permission denied'))

      await expect(
        storageService.getSignedUrl('manuscripts/test.pdf')
      ).rejects.toThrow(OcrError)

      await expect(
        storageService.getSignedUrl('manuscripts/test.pdf')
      ).rejects.toMatchObject({
        code: OcrErrorCodes.GCS_ERROR,
        statusCode: 500,
      })
    })
  })

  describe('getPdfBuffer', () => {
    it('should download PDF as buffer', async () => {
      const mockBuffer = Buffer.from('PDF content here')
      mockFile.download.mockResolvedValue([mockBuffer])

      const buffer = await storageService.getPdfBuffer('manuscripts/test.pdf')

      expect(mockFile.download).toHaveBeenCalled()
      expect(buffer).toEqual(mockBuffer)
      expect(Buffer.isBuffer(buffer)).toBe(true)
    })

    it('should throw OcrError on download failure', async () => {
      mockFile.download.mockRejectedValue(new Error('File not found'))

      await expect(
        storageService.getPdfBuffer('manuscripts/nonexistent.pdf')
      ).rejects.toThrow(OcrError)

      await expect(
        storageService.getPdfBuffer('manuscripts/nonexistent.pdf')
      ).rejects.toMatchObject({
        code: OcrErrorCodes.GCS_ERROR,
        statusCode: 500,
      })
    })
  })

  describe('deletePdf', () => {
    it('should delete PDF from storage', async () => {
      mockFile.delete.mockResolvedValue(undefined)

      await storageService.deletePdf('manuscripts/test.pdf')

      expect(mockBucket.file).toHaveBeenCalledWith('manuscripts/test.pdf')
      expect(mockFile.delete).toHaveBeenCalled()
    })

    it('should throw OcrError on deletion failure', async () => {
      mockFile.delete.mockRejectedValue(new Error('Delete failed'))

      await expect(
        storageService.deletePdf('manuscripts/test.pdf')
      ).rejects.toThrow(OcrError)

      await expect(
        storageService.deletePdf('manuscripts/test.pdf')
      ).rejects.toMatchObject({
        code: OcrErrorCodes.GCS_ERROR,
        statusCode: 500,
      })
    })
  })

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      mockFile.exists.mockResolvedValue([true])

      const exists = await storageService.fileExists('manuscripts/test.pdf')

      expect(mockFile.exists).toHaveBeenCalled()
      expect(exists).toBe(true)
    })

    it('should return false if file does not exist', async () => {
      mockFile.exists.mockResolvedValue([false])

      const exists = await storageService.fileExists('manuscripts/nonexistent.pdf')

      expect(exists).toBe(false)
    })

    it('should return false on error', async () => {
      mockFile.exists.mockRejectedValue(new Error('GCS error'))

      const exists = await storageService.fileExists('manuscripts/test.pdf')

      expect(exists).toBe(false)
    })
  })

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const mockMetadata = {
        name: 'test.pdf',
        bucket: 'test-bucket',
        size: 12345,
        contentType: 'application/pdf',
        metadata: {
          uploadedBy: 'test@example.com',
          title: 'Test Novel',
        },
      }

      mockFile.getMetadata.mockResolvedValue([mockMetadata])

      const metadata = await storageService.getFileMetadata('manuscripts/test.pdf')

      expect(mockFile.getMetadata).toHaveBeenCalled()
      expect(metadata).toEqual(mockMetadata)
    })

    it('should throw OcrError on metadata retrieval failure', async () => {
      mockFile.getMetadata.mockRejectedValue(new Error('Not found'))

      await expect(
        storageService.getFileMetadata('manuscripts/test.pdf')
      ).rejects.toThrow(OcrError)

      await expect(
        storageService.getFileMetadata('manuscripts/test.pdf')
      ).rejects.toMatchObject({
        code: OcrErrorCodes.GCS_ERROR,
        statusCode: 500,
      })
    })
  })
})
