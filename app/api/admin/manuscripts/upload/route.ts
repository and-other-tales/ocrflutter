import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import formidable from 'formidable'
import { Readable } from 'stream'
import { uploadSchema } from '@/lib/validations/manuscript'
import { fileValidationService } from '@/lib/services/file-validation.service'
import { storageService } from '@/lib/services/storage.service'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'
import { TextOrientation } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Upload PDF manuscript for OCR processing
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await request.formData()

    const title = formData.get('title') as string
    const author = formData.get('author') as string | null
    const language = formData.get('language') as string
    const orientationHint = formData.get('orientationHint') as string | null
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    // Validate metadata
    const metadataValidation = uploadSchema.safeParse({
      title,
      author: author || undefined,
      language: language || 'en',
      orientationHint: orientationHint as TextOrientation | undefined,
    })

    if (!metadataValidation.success) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: metadataValidation.error.errors },
        { status: 400 }
      )
    }

    const validatedMetadata = metadataValidation.data

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Validate file
    const validation = await fileValidationService.validatePdfFile(
      fileBuffer,
      file.name
    )

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          errorCode: validation.errorCode,
        },
        { status: 400 }
      )
    }

    // Sanitize filename
    const sanitizedFilename = fileValidationService.sanitizeFilename(file.name)

    // Upload to GCS
    const { url, path } = await storageService.uploadPdf(
      fileBuffer,
      sanitizedFilename,
      {
        uploadedBy: session.user.email,
        title: validatedMetadata.title,
        author: validatedMetadata.author,
        language: validatedMetadata.language,
      }
    )

    // Create manuscript record and queue OCR job
    const { manuscript, jobId } = await manuscriptService.createManuscript({
      title: validatedMetadata.title,
      author: validatedMetadata.author,
      language: validatedMetadata.language,
      orientationHint: validatedMetadata.orientationHint,
      originalFilename: sanitizedFilename,
      fileSize: fileBuffer.length,
      mimeType: validation.mimeType || 'application/pdf',
      pdfStorageUrl: url,
      pdfStoragePath: path,
      uploadedBy: session.user.email,
    })

    return NextResponse.json(
      {
        success: true,
        manuscript: {
          id: manuscript.id,
          title: manuscript.title,
          author: manuscript.author,
          language: manuscript.language,
          status: manuscript.ocrStatus,
          jobId,
        },
        message: 'PDF uploaded successfully and OCR processing started',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Upload API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.code,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload PDF', details: error.message },
      { status: 500 }
    )
  }
}
