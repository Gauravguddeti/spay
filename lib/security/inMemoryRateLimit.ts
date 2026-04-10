type RateLimitEntry = {
  count: number
  resetAt: number
}

const ATTEMPT_STORE = new Map<string, RateLimitEntry>()

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
  windowMs = 15 * 60 * 1000,
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
