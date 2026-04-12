type RateLimitEntry = {
  count: number
  resetAt: number
}

// Used as fallback when Upstash Redis is not configured.
// When UPSTASH_REDIS_REST_URL is set, middleware.ts uses Redis instead.
// Do not use both simultaneously for the same route.
const ATTEMPT_STORE = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_WINDOW_MS = 15 * 60 * 1000

const cleanupTimer = setInterval(() => {
  const now = Date.now()

  for (const [key, value] of ATTEMPT_STORE.entries()) {
    if (now >= value.resetAt) {
      ATTEMPT_STORE.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

cleanupTimer.unref()

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (!forwarded) {
    return "unknown"
  }

  const [first] = forwarded.split(",")
  return first.trim() || "unknown"
}

export function takeRateLimitAttempt(
  key: string,
  maxAttempts = 5,
  windowMs = DEFAULT_WINDOW_MS,
): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const now = Date.now()
  const existing = ATTEMPT_STORE.get(key)

  if (!existing || now >= existing.resetAt) {
    ATTEMPT_STORE.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      retryAfterSeconds: 0,
    }
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return {
      allowed: false,
      retryAfterSeconds,
    }
  }

  existing.count += 1
  ATTEMPT_STORE.set(key, existing)

  return {
    allowed: true,
    retryAfterSeconds: 0,
  }
}
