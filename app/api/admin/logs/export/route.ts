import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logService } from "@/lib/services/log.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get("format") || "csv") as "csv" | "json"

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
    }

    const data = await logService.export(format, filters)

    const headers = new Headers()
    if (format === "csv") {
      headers.set("Content-Type", "text/csv")
      headers.set("Content-Disposition", `attachment; filename="logs-${Date.now()}.csv"`)
    } else {
      headers.set("Content-Type", "application/json")
      headers.set("Content-Disposition", `attachment; filename="logs-${Date.now()}.json"`)
    }

    return new NextResponse(data, { headers })
  } catch (error: any) {
    console.error("GET /api/admin/logs/export error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to export logs",
      },
      { status: 500 }
    )
  }
}
