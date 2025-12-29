import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { convertToNovelSchema } from '@/lib/validations/manuscript'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * Convert manuscript to novel entry
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

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = convertToNovelSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const convertData = validation.data

    // Convert to novel
    const result = await manuscriptService.convertToNovel(
      manuscriptId,
      {
        url: convertData.url,
        chapter: convertData.chapter,
        pageNumber: convertData.pageNumber,
        unlockContent: convertData.unlockContent,
        metadata: convertData.metadata,
      },
      session.user.email
    )

    return NextResponse.json({
      success: true,
      message: 'Manuscript converted to novel successfully',
      manuscript: {
        id: result.manuscript.id,
        title: result.manuscript.title,
      },
      novel: {
        id: result.novel.id,
        title: result.novel.title,
        url: result.novel.url,
      },
    })
  } catch (error: any) {
    console.error('[Convert to Novel API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to convert to novel', details: error.message },
      { status: 500 }
    )
  }
}
