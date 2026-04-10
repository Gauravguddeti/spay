import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { neonAuth } from "@/lib/auth/server"

// ---------------------------------------------------------------------------
// Rate limiter — 10 requests per 60 seconds per IP
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
// Get a free Redis instance at: https://console.upstash.com/
// ---------------------------------------------------------------------------
const hasUpstashEnv = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

const ratelimit = hasUpstashEnv
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: false,
      prefix: "spay:ratelimit",
    })
  : null

const RATE_LIMITED_PATHS = ["/api/auth/sign-in", "/api/auth/sign-up"]

async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  if (!ratelimit) {
    return null
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"

  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      { status: 429 },
    )
  }

  return null
}

const protectedMiddleware = neonAuth.middleware({ loginUrl: "/login" })

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Apply rate limiting to auth and signup API routes
  const isRateLimited = RATE_LIMITED_PATHS.some((path) => pathname.startsWith(path))

  if (isRateLimited) {
    const rateLimitResponse = await applyRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  if (pathname.startsWith("/dashboard")) {
    return protectedMiddleware(req)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/auth/:path*"],
}