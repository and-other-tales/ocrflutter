import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * Reprocess manuscript (retry OCR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manuscriptId = params.id

    // Reprocess manuscript
    const jobId = await manuscriptService.reprocessManuscript(manuscriptId)

    return NextResponse.json({
      success: true,
      message: 'Manuscript queued for reprocessing',
      jobId,
    })
  } catch (error: any) {
    console.error('[Manuscript Reprocess API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reprocess manuscript', details: error.message },
      { status: 500 }
    )
  }
}
