import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { analyticsService } from "@/lib/services/analytics.service"
import { subDays } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("start_date")
      ? new Date(searchParams.get("start_date")!)
      : subDays(new Date(), 30)
    const endDate = searchParams.get("end_date")
      ? new Date(searchParams.get("end_date")!)
      : new Date()
    const interval = (searchParams.get("interval") as "hour" | "day" | "week") || "day"

    const result = await analyticsService.getTimeline(startDate, endDate, interval)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("GET /api/admin/analytics/timeline error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch timeline",
      },
      { status: 500 }
    )
  }
}
