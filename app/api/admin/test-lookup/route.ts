import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { lookupService } from "@/lib/services/lookup.service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { line1, line2, line3 } = body

    if (!line1 || !line2 || !line3) {
      return NextResponse.json(
        {
          success: false,
          error: "line1, line2, and line3 are required",
        },
        { status: 400 }
      )
    }

    const result = await lookupService.testLookup(line1, line2, line3)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("POST /api/admin/test-lookup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to test lookup",
      },
      { status: 500 }
    )
  }
}
