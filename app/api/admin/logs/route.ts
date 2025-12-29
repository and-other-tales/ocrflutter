import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logService } from "@/lib/services/log.service"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    const filters = {
      startDate: searchParams.get("start_date")
        ? new Date(searchParams.get("start_date")!)
        : undefined,
      endDate: searchParams.get("end_date")
        ? new Date(searchParams.get("end_date")!)
        : undefined,
      success:
        searchParams.get("success") === "true"
          ? true
          : searchParams.get("success") === "false"
          ? false
          : undefined,
      novelId: searchParams.get("novel_id") || undefined,
      ipAddress: searchParams.get("ip_address") || undefined,
    }

    const result = await logService.list(page, limit, filters)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("GET /api/admin/logs error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch logs",
      },
      { status: 500 }
    )
  }
}
