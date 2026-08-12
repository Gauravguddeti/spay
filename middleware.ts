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

function buildCspHeader(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
    // Keep style unsafe-inline for Tailwind/runtime styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.pexels.com",
    "connect-src 'self' https://api.anthropic.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

function attachSecurityHeaders(response: NextResponse, cspHeader: string, nonce: string) {
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("x-nonce", nonce)
  return response
}

// Simple in-memory fallback for edge environments when Upstash Redis is not configured.
// Note: State does not persist across isolates/redeployments, but provides basic protection.
const fallbackIpCache = new Map<string, { count: number; timestamp: number }>()
const FALLBACK_WINDOW_MS = 60 * 1000
const FALLBACK_MAX_REQS = 10

async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"

  if (ratelimit) {
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 },
      )
    }
    return null
  }

  // --- Fallback logic ---
  const now = Date.now()
  const record = fallbackIpCache.get(ip)

  if (record && now - record.timestamp < FALLBACK_WINDOW_MS) {
    if (record.count >= FALLBACK_MAX_REQS) {
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 },
      )
    }
    record.count += 1
  } else {
    fallbackIpCache.set(ip, { count: 1, timestamp: now })
  }

  // Optional: Clean up old entries periodically to prevent memory leaks in the isolate
  if (Math.random() < 0.05) {
    for (const [key, val] of fallbackIpCache.entries()) {
      if (now - val.timestamp > FALLBACK_WINDOW_MS) {
        fallbackIpCache.delete(key)
      }
    }
  }

  return null
}

const protectedMiddleware = neonAuth.middleware({ loginUrl: "/login" })

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const nonce = crypto.randomUUID().replace(/-/g, "")
  const cspHeader = buildCspHeader(nonce)
  const requestHeaders = new Headers(req.headers)

  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  // Apply rate limiting to auth and signup API routes
  const isRateLimited = RATE_LIMITED_PATHS.some((path) => pathname.startsWith(path))

  if (isRateLimited) {
    const rateLimitResponse = await applyRateLimit(req)
    if (rateLimitResponse) {
      return attachSecurityHeaders(rateLimitResponse, cspHeader, nonce)
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const authResponse = await protectedMiddleware(req)

    if (authResponse.headers.get("location")) {
      return attachSecurityHeaders(authResponse, cspHeader, nonce)
    }

    const passthroughResponse = NextResponse.next({
      request: { headers: requestHeaders },
    })

    const setCookie = authResponse.headers.get("set-cookie")
    if (setCookie) {
      passthroughResponse.headers.set("set-cookie", setCookie)
    }

    return attachSecurityHeaders(passthroughResponse, cspHeader, nonce)
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  return attachSecurityHeaders(response, cspHeader, nonce)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/auth/:path*",
    "/api/subscriptions/:path*",
    "/api/alerts/:path*",
    "/api/integrations/:path*",
    "/api/organizations/:path*",
    "/api/settings/:path*",
  ],
}