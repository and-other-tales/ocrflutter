import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * Get manuscript details by ID
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

    // Get manuscript
    const manuscript = await manuscriptService.getManuscriptById(manuscriptId)

    return NextResponse.json({ manuscript })
  } catch (error: any) {
    console.error('[Manuscript Detail API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get manuscript', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Delete manuscript and associated files
 */
export async function DELETE(
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

    // Delete manuscript
    await manuscriptService.deleteManuscript(manuscriptId)

    return NextResponse.json({
      success: true,
      message: 'Manuscript deleted successfully',
    })
  } catch (error: any) {
    console.error('[Manuscript Delete API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete manuscript', details: error.message },
      { status: 500 }
    )
  }
}
