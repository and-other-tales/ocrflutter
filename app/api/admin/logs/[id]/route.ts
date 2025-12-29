import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logService } from "@/lib/services/log.service"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const log = await logService.getById(params.id)

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: "Log not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { log },
    })
  } catch (error: any) {
    console.error(`GET /api/admin/logs/${params.id} error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch log",
      },
      { status: 500 }
    )
  }
}
