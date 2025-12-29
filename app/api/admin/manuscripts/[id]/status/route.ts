import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * Get OCR job status for a manuscript
 */
export async function GET(
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

    // Get job status
    const status = await manuscriptService.getJobStatus(manuscriptId)

    return NextResponse.json(status)
  } catch (error: any) {
    console.error('[Manuscript Status API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get job status', details: error.message },
      { status: 500 }
    )
  }
}
