import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { wordsUpdateSchema } from '@/lib/validations/manuscript'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * Get extracted words for a manuscript
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

    return NextResponse.json({
      extractedWords: manuscript.extractedWords,
      manuallyEdited: manuscript.manuallyEdited,
      editedBy: manuscript.editedBy,
      editedAt: manuscript.editedAt,
    })
  } catch (error: any) {
    console.error('[Manuscript Words GET API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get extracted words', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update extracted words manually
 */
export async function PATCH(
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
    const validation = wordsUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const wordsUpdate = validation.data

    // Update words
    const manuscript = await manuscriptService.updateExtractedWords(manuscriptId, {
      line1Words: wordsUpdate.line1Words,
      line2Words: wordsUpdate.line2Words,
      line3Words: wordsUpdate.line3Words,
      editedBy: session.user.email,
    })

    return NextResponse.json({
      success: true,
      message: 'Extracted words updated successfully',
      extractedWords: manuscript.extractedWords,
    })
  } catch (error: any) {
    console.error('[Manuscript Words PATCH API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update extracted words', details: error.message },
      { status: 500 }
    )
  }
}
