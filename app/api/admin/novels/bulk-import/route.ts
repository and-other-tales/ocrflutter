import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { novelService } from "@/lib/services/novel.service"
import { novelSchema } from "@/lib/validations/novel"
import { z } from "zod"

const bulkImportSchema = z.object({
  novels: z.array(novelSchema),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { novels, options } = bulkImportSchema.parse(body)

    const result = await novelService.bulkImport(novels, {
      ...options,
      createdBy: session.user.email,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} novels, skipped ${result.skipped}, failed ${result.failed}`,
    })
  } catch (error: any) {
    console.error("POST /api/admin/novels/bulk-import error:", error)

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
        error: error.message || "Failed to import novels",
      },
      { status: 500 }
    )
  }
}
