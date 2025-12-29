import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiKeyService } from "@/lib/services/apikey.service"
import { z } from "zod"

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  appName: z.string().optional(),
  rateLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKeys = await apiKeyService.list()

    return NextResponse.json({
      success: true,
      data: { apiKeys },
    })
  } catch (error: any) {
    console.error("GET /api/admin/api-keys error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch API keys",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create API keys
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
    const validatedData = createApiKeySchema.parse(body)

    const apiKey = await apiKeyService.create(validatedData)

    return NextResponse.json(
      {
        success: true,
        data: { apiKey },
        message: "API key created successfully. Save the key now - it won't be shown again!",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST /api/admin/api-keys error:", error)

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
        error: error.message || "Failed to create API key",
      },
      { status: 500 }
    )
  }
}
