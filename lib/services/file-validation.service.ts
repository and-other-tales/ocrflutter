import { fileTypeFromBuffer } from 'file-type'
import { ocrConfig } from '../config/ocr.config'
import { OcrError, OcrErrorCodes } from '../utils/errors'
import net from 'net'

export interface FileValidationResult {
  valid: boolean
  error?: string
  errorCode?: string
  mimeType?: string
  fileSize?: number
  warnings?: string[]
}

class FileValidationService {
  /**
   * Validate a PDF file buffer
   */
  async validatePdfFile(
    fileBuffer: Buffer,
    filename: string
  ): Promise<FileValidationResult> {
    const warnings: string[] = []

    try {
      // 1. Check file size
      if (fileBuffer.length === 0) {
        return {
          valid: false,
          error: 'File is empty',
          errorCode: OcrErrorCodes.INVALID_FILE_TYPE,
        }
      }

      if (fileBuffer.length > ocrConfig.upload.maxSizeBytes) {
        const maxSizeMb = ocrConfig.upload.maxSizeMb
        return {
          valid: false,
          error: `File size exceeds maximum allowed size of ${maxSizeMb}MB`,
          errorCode: OcrErrorCodes.FILE_TOO_LARGE,
          fileSize: fileBuffer.length,
        }
      }

      // 2. Validate file type using magic number (not extension)
      const fileType = await fileTypeFromBuffer(fileBuffer)

      if (!fileType || fileType.mime !== 'application/pdf') {
        return {
          valid: false,
          error: 'File is not a valid PDF (magic number check failed)',
          errorCode: OcrErrorCodes.INVALID_FILE_TYPE,
          mimeType: fileType?.mime,
        }
      }

      // 3. Check PDF header
      const pdfHeader = fileBuffer.slice(0, 5).toString('utf-8')
      if (!pdfHeader.startsWith('%PDF-')) {
        return {
          valid: false,
          error: 'Invalid PDF header',
          errorCode: OcrErrorCodes.INVALID_PDF,
        }
      }

      // 4. Check if PDF is encrypted
      const isEncrypted = this.checkIfEncrypted(fileBuffer)
      if (isEncrypted) {
        return {
          valid: false,
          error: 'PDF is password-protected or encrypted',
          errorCode: OcrErrorCodes.ENCRYPTED_PDF,
        }
      }

      // 5. Check for basic corruption
      const isCorrupted = this.checkIfCorrupted(fileBuffer)
      if (isCorrupted) {
        return {
          valid: false,
          error: 'PDF file appears to be corrupted',
          errorCode: OcrErrorCodes.CORRUPTED_FILE,
        }
      }

      // 6. Optional: Malware scan
      if (ocrConfig.malwareScan.enabled) {
        try {
          const isMalware = await this.scanForMalware(fileBuffer)
          if (isMalware) {
            return {
              valid: false,
              error: 'Malware detected in file',
              errorCode: OcrErrorCodes.MALWARE_DETECTED,
            }
          }
        } catch (error) {
          console.warn('[FileValidation] Malware scan failed:', error)
          warnings.push('Malware scan could not be completed')
        }
      }

      // All checks passed
      return {
        valid: true,
        mimeType: fileType.mime,
        fileSize: fileBuffer.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    } catch (error: any) {
      console.error('[FileValidation] Validation error:', error)
      return {
        valid: false,
        error: `File validation failed: ${error.message}`,
        errorCode: OcrErrorCodes.INVALID_PDF,
      }
    }
  }

  /**
   * Check if PDF is encrypted or password-protected
   */
  private checkIfEncrypted(buffer: Buffer): boolean {
    try {
      const pdfString = buffer.toString('utf-8')

      // Check for encryption markers in PDF
      // PDFs with encryption have /Encrypt in their trailer
      const hasEncryptDict = pdfString.includes('/Encrypt')

      // Also check for /Filter in encryption dictionary
      const hasStandardSecurity = pdfString.includes('/Standard')

      return hasEncryptDict || hasStandardSecurity
    } catch (error) {
      console.warn('[FileValidation] Error checking encryption:', error)
      return false
    }
  }

  /**
   * Check if PDF is corrupted
   */
  private checkIfCorrupted(buffer: Buffer): boolean {
    try {
      const pdfString = buffer.toString('utf-8')

      // Check for EOF marker
      const hasEof = pdfString.includes('%%EOF')
      if (!hasEof) {
        return true
      }

      // Check for basic PDF structure
      const hasXref = pdfString.includes('xref')
      const hasTrailer = pdfString.includes('trailer')

      if (!hasXref || !hasTrailer) {
        return true
      }

      return false
    } catch (error) {
      console.warn('[FileValidation] Error checking corruption:', error)
      return true
    }
  }

  /**
   * Scan file for malware using ClamAV
   */
  private async scanForMalware(buffer: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const client = new net.Socket()
        const host = ocrConfig.malwareScan.host
        const port = ocrConfig.malwareScan.port

        let response = ''

        client.connect(port, host, () => {
          // Send INSTREAM command
          client.write('zINSTREAM\0')

          // Send file data in chunks
          const chunkSize = 1024
          for (let i = 0; i < buffer.length; i += chunkSize) {
            const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length))
            const sizeBuffer = Buffer.allocUnsafe(4)
            sizeBuffer.writeUInt32BE(chunk.length, 0)
            client.write(sizeBuffer)
            client.write(chunk)
          }

          // Send zero-length chunk to signal end
          const endBuffer = Buffer.allocUnsafe(4)
          endBuffer.writeUInt32BE(0, 0)
          client.write(endBuffer)
        })

        client.on('data', (data) => {
          response += data.toString()
        })

        client.on('end', () => {
          client.destroy()

          // ClamAV returns "stream: OK" if clean
          // Returns "stream: <virus name> FOUND" if infected
          if (response.includes('FOUND')) {
            console.warn('[FileValidation] Malware detected:', response)
            resolve(true)
          } else {
            resolve(false)
          }
        })

        client.on('error', (error) => {
          client.destroy()
          console.error('[FileValidation] ClamAV connection error:', error)
          reject(error)
        })

        // Timeout after 30 seconds
        client.setTimeout(30000, () => {
          client.destroy()
          reject(new Error('ClamAV scan timeout'))
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '')

    // Remove special characters except alphanumeric, dots, dashes, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Ensure it has .pdf extension
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf'
    }

    // Limit length
    if (sanitized.length > 255) {
      const extension = '.pdf'
      sanitized = sanitized.substring(0, 255 - extension.length) + extension
    }

    return sanitized
  }

  /**
   * Validate file metadata
   */
  validateMetadata(metadata: {
    title?: string
    author?: string
    language?: string
  }): { valid: boolean; error?: string } {
    if (!metadata.title || metadata.title.trim().length === 0) {
      return {
        valid: false,
        error: 'Title is required',
      }
    }

    if (metadata.title.length > 500) {
      return {
        valid: false,
        error: 'Title exceeds maximum length of 500 characters',
      }
    }

    if (metadata.author && metadata.author.length > 300) {
      return {
        valid: false,
        error: 'Author name exceeds maximum length of 300 characters',
      }
    }

    if (metadata.language && !/^[a-z]{2,3}$/.test(metadata.language)) {
      return {
        valid: false,
        error: 'Invalid language code (must be 2-3 lowercase letters)',
      }
    }

    return { valid: true }
  }

  /**
   * Get file info
   */
  async getFileInfo(buffer: Buffer): Promise<{
    mimeType?: string
    extension?: string
    size: number
  }> {
    const fileType = await fileTypeFromBuffer(buffer)

    return {
      mimeType: fileType?.mime,
      extension: fileType?.ext,
      size: buffer.length,
    }
  }
}

export const fileValidationService = new FileValidationService()
