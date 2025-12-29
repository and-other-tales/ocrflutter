import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Maximum requests per interval
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>()

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

/**
 * Rate limiter middleware for API routes
 * @param config Rate limit configuration
 * @returns Middleware function
 */
export function rateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest, identifier: string) => {
    const key = `${identifier}:${Math.floor(Date.now() / config.interval)}`
    const store = rateLimitStore.get(key)

    if (!store) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: Date.now() + config.interval,
      })
      return null // No rate limit exceeded
    }

    if (store.count >= config.maxRequests) {
      const resetInSeconds = Math.ceil((store.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": store.resetTime.toString(),
            "Retry-After": resetInSeconds.toString(),
          },
        }
      )
    }

    store.count++
    return null // No rate limit exceeded
  }
}

/**
 * IP-based rate limiter
 * @param request NextRequest
 * @param config Rate limit configuration
 */
export async function rateLimitByIP(
  request: NextRequest,
  config: RateLimitConfig = { interval: 60000, maxRequests: 60 }
) {
  const ip = request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown"

  const limiter = rateLimiter(config)
  return limiter(request, `ip:${ip}`)
}

/**
 * API key-based rate limiter
 * @param apiKey API key string
 * @param config Rate limit configuration (uses API key's rate limit)
 */
export async function rateLimitByApiKey(apiKey: string) {
  try {
    // Get API key from database
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    })

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key",
          code: "INVALID_API_KEY",
        },
        { status: 401 }
      )
    }

    if (!key.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "API key is inactive",
          code: "INACTIVE_API_KEY",
        },
        { status: 403 }
      )
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "API key has expired",
          code: "EXPIRED_API_KEY",
        },
        { status: 403 }
      )
    }

    // Check rate limit (per hour)
    const hourKey = `apikey:${key.id}:${Math.floor(Date.now() / 3600000)}`
    const store = rateLimitStore.get(hourKey)

    if (!store) {
      rateLimitStore.set(hourKey, {
        count: 1,
        resetTime: Date.now() + 3600000, // 1 hour
      })
      return null // No rate limit exceeded
    }

    if (store.count >= key.rateLimit) {
      const resetInSeconds = Math.ceil((store.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          success: false,
          error: "API key rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": key.rateLimit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": store.resetTime.toString(),
            "Retry-After": resetInSeconds.toString(),
          },
        }
      )
    }

    store.count++

    // Return remaining requests header info
    return {
      headers: {
        "X-RateLimit-Limit": key.rateLimit.toString(),
        "X-RateLimit-Remaining": (key.rateLimit - store.count).toString(),
        "X-RateLimit-Reset": store.resetTime.toString(),
      },
      apiKey: key,
    }
  } catch (error: any) {
    console.error("Rate limit error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check rate limit",
      },
      { status: 500 }
    )
  }
}

/**
 * Combined rate limiter (IP + API key fallback)
 * @param request NextRequest
 */
export async function rateLimitRequest(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "")

  if (apiKey) {
    // Use API key-based rate limiting
    return rateLimitByApiKey(apiKey)
  }

  // Fallback to IP-based rate limiting
  return rateLimitByIP(request, { interval: 60000, maxRequests: 20 })
}
