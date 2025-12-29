import { Storage } from '@google-cloud/storage'
import { ocrConfig } from '../config/ocr.config'
import { OcrError, OcrErrorCodes } from '../utils/errors'
import path from 'path'

class StorageService {
  private storage: Storage
  private bucketName: string

  constructor() {
    // Initialize Google Cloud Storage
    this.storage = new Storage({
      projectId: ocrConfig.google.projectId,
      ...(ocrConfig.google.credentials && {
        keyFilename: ocrConfig.google.credentials,
      }),
    })
    this.bucketName = ocrConfig.google.bucketName
  }

  /**
   * Upload a PDF file to Google Cloud Storage
   */
  async uploadPdf(
    fileBuffer: Buffer,
    filename: string,
    metadata: {
      uploadedBy: string
      title: string
      author?: string
      language?: string
    }
  ): Promise<{ url: string; path: string }> {
    try {
      const bucket = this.storage.bucket(this.bucketName)

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `manuscripts/${timestamp}-${sanitizedFilename}`

      const file = bucket.file(storagePath)

      // Upload with metadata
      await file.save(fileBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Make file private (requires signed URL for access)
      await file.makePrivate()

      // Get public URL (will require signed URL for actual access)
      const url = `https://storage.googleapis.com/${this.bucketName}/${storagePath}`

      return {
        url,
        path: storagePath,
      }
    } catch (error: any) {
      console.error('GCS upload error:', error)
      throw new OcrError(
        `Failed to upload PDF: ${error.message}`,
        OcrErrorCodes.GCS_ERROR,
        500
      )
    }
  }

  /**
   * Get a signed URL for temporary PDF access
   */
  async getSignedUrl(
    storagePath: string,
    expiresInMinutes: number = 60
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(storagePath)

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      })

      return url
    } catch (error: any) {
      console.error('GCS signed URL error:', error)
      throw new OcrError(
        `Failed to generate signed URL: ${error.message}`,
        OcrErrorCodes.GCS_ERROR,
        500
      )
    }
  }

  /**
   * Download PDF as buffer for OCR processing
   */
  async getPdfBuffer(storagePath: string): Promise<Buffer> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(storagePath)

      const [buffer] = await file.download()
      return buffer
    } catch (error: any) {
      console.error('GCS download error:', error)
      throw new OcrError(
        `Failed to download PDF: ${error.message}`,
        OcrErrorCodes.GCS_ERROR,
        500
      )
    }
  }

  /**
   * Delete a PDF file from storage
   */
  async deletePdf(storagePath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(storagePath)

      await file.delete()
    } catch (error: any) {
      console.error('GCS delete error:', error)
      throw new OcrError(
        `Failed to delete PDF: ${error.message}`,
        OcrErrorCodes.GCS_ERROR,
        500
      )
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(storagePath)

      const [exists] = await file.exists()
      return exists
    } catch (error: any) {
      console.error('GCS exists check error:', error)
      return false
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(storagePath: string): Promise<any> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(storagePath)

      const [metadata] = await file.getMetadata()
      return metadata
    } catch (error: any) {
      console.error('GCS metadata error:', error)
      throw new OcrError(
        `Failed to get file metadata: ${error.message}`,
        OcrErrorCodes.GCS_ERROR,
        500
      )
    }
  }
}

export const storageService = new StorageService()
