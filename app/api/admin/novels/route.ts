import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { novelService } from "@/lib/services/novel.service"
import { novelSchema, novelQuerySchema } from "@/lib/validations/novel"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = novelQuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      language: searchParams.get("language"),
      sort: searchParams.get("sort"),
      order: searchParams.get("order"),
    })

    const result = await novelService.list(query)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("GET /api/admin/novels error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch novels",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = novelSchema.parse(body)

    const novel = await novelService.create(validatedData, session.user.email)

    return NextResponse.json(
      {
        success: true,
        data: { novel },
        message: "Novel created successfully",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST /api/admin/novels error:", error)

    if (error.message === "A novel with these lines already exists") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "DUPLICATE_ENTRY",
        },
        { status: 409 }
      )
    }

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create novel",
      },
      { status: 500 }
    )
  }
}
