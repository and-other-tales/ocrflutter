import { NextRequest, NextResponse } from "next/server"
import { lookupService } from "@/lib/services/lookup.service"
import { rateLimitRequest } from "@/lib/middleware/rateLimit"

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitRequest(request)

    // If rate limit is exceeded, return the error response
    if (rateLimitResult && 'headers' in rateLimitResult && rateLimitResult.headers) {
      // Rate limit passed, but we have headers to include
      const apiKey = rateLimitResult.apiKey
    } else if (rateLimitResult) {
      // Rate limit exceeded or error
      return rateLimitResult
    }

    const body = await request.json()

    // Accept both formats: { lines: [[],[],[]] } or { line1: [], line2: [], line3: [] }
    let lines: string[][]

    if (body.lines && Array.isArray(body.lines)) {
      lines = body.lines
    } else if (body.line1 && body.line2 && body.line3) {
      lines = [body.line1, body.line2, body.line3]
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format. Expected 'lines' array or 'line1', 'line2', 'line3' arrays",
        },
        { status: 400 }
      )
    }

    // Validate input
    if (!Array.isArray(lines) || lines.length !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input: expected 3 lines",
        },
        { status: 400 }
      )
    }

    for (const line of lines) {
      if (!Array.isArray(line) || line.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid input: each line must be a non-empty array of words",
          },
          { status: 400 }
        )
      }
    }

    const result = await lookupService.lookup(lines)

    // Prepare rate limit headers
    const headers: Record<string, string> = {}
    if (rateLimitResult && 'headers' in rateLimitResult && rateLimitResult.headers) {
      Object.assign(headers, rateLimitResult.headers)
    }

    if (result.match) {
      return NextResponse.json(
        {
          success: true,
          data: {
            url: result.novel?.url,
            title: result.novel?.title,
            unlockContent: result.novel?.unlockContent,
          },
          match: true,
          responseTimeMs: result.responseTimeMs,
        },
        { headers }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          match: false,
          message: result.message,
          suggestions: result.suggestions,
          responseTimeMs: result.responseTimeMs,
        },
        { status: 404, headers }
      )
    }
  } catch (error: any) {
    console.error("POST /api/novel/lookup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
