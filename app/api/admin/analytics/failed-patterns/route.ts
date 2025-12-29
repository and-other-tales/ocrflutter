import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { analyticsService } from "@/lib/services/analytics.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "20")

    const result = await analyticsService.getFailedPatterns(limit)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("GET /api/admin/analytics/failed-patterns error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch failed patterns",
      },
      { status: 500 }
    )
  }
}
