import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { novelService } from "@/lib/services/novel.service"
import { novelUpdateSchema } from "@/lib/validations/novel"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await novelService.getById(params.id)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Novel not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error(`GET /api/admin/novels/${params.id} error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch novel",
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = novelUpdateSchema.parse(body)

    const novel = await novelService.update(params.id, validatedData)

    return NextResponse.json({
      success: true,
      data: { novel },
      message: "Novel updated successfully",
    })
  } catch (error: any) {
    console.error(`PUT /api/admin/novels/${params.id} error:`, error)

    if (error.message === "Novel not found") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

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
        error: error.message || "Failed to update novel",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
          code: "FORBIDDEN",
        },
        { status: 403 }
      )
    }

    await novelService.delete(params.id)

    return NextResponse.json({
      success: true,
      message: "Novel deleted successfully",
    })
  } catch (error: any) {
    console.error(`DELETE /api/admin/novels/${params.id} error:`, error)

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "Novel not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete novel",
      },
      { status: 500 }
    )
  }
}
