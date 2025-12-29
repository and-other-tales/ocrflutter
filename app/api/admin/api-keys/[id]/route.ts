import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { apiKeyService } from "@/lib/services/apikey.service"
import { z } from "zod"

const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  appName: z.string().optional(),
  rateLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = await apiKeyService.getById(params.id, false)

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { apiKey },
    })
  } catch (error: any) {
    console.error(`GET /api/admin/api-keys/${params.id} error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch API key",
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
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const body = await request.json()
    const validatedData = updateApiKeySchema.parse(body)

    const apiKey = await apiKeyService.update(params.id, validatedData)

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          key: apiKeyService.maskKey(apiKey.key),
        },
      },
      message: "API key updated successfully",
    })
  } catch (error: any) {
    console.error(`PUT /api/admin/api-keys/${params.id} error:`, error)

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "API key not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
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
        error: error.message || "Failed to update API key",
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
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    await apiKeyService.delete(params.id)

    return NextResponse.json({
      success: true,
      message: "API key deleted successfully",
    })
  } catch (error: any) {
    console.error(`DELETE /api/admin/api-keys/${params.id} error:`, error)

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "API key not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete API key",
      },
      { status: 500 }
    )
  }
}
