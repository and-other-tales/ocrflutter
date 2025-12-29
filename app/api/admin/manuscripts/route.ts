import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { manuscriptQuerySchema } from '@/lib/validations/manuscript'
import { manuscriptService } from '@/lib/services/manuscript.service'
import { OcrError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

/**
 * List manuscripts with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)

    const queryValidation = manuscriptQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      language: searchParams.get('language'),
      uploadedBy: searchParams.get('uploadedBy'),
      search: searchParams.get('search'),
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.errors },
        { status: 400 }
      )
    }

    const query = queryValidation.data

    // List manuscripts
    const result = await manuscriptService.listManuscripts(
      {
        status: query.status,
        language: query.language,
        uploadedBy: query.uploadedBy,
        search: query.search,
      },
      query.page,
      query.limit
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Manuscripts List API] Error:', error)

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to list manuscripts', details: error.message },
      { status: 500 }
    )
  }
}
