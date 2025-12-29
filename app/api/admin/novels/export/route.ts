import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { novelService } from "@/lib/services/novel.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get("format") || "csv") as "csv" | "json"

    const data = await novelService.export(format)

    const headers = new Headers()
    if (format === "csv") {
      headers.set("Content-Type", "text/csv")
      headers.set("Content-Disposition", `attachment; filename="novels-${Date.now()}.csv"`)
    } else {
      headers.set("Content-Type", "application/json")
      headers.set("Content-Disposition", `attachment; filename="novels-${Date.now()}.json"`)
    }

    return new NextResponse(data, { headers })
  } catch (error: any) {
    console.error("GET /api/admin/novels/export error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to export novels",
      },
      { status: 500 }
    )
  }
}
