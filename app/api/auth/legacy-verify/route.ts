import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getUserByEmail } from "@/lib/db/queries/users"
import { getClientIpFromHeaders, takeRateLimitAttempt } from "@/lib/security/inMemoryRateLimit"

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const ip = getClientIpFromHeaders(request.headers)
  const rateLimit = takeRateLimitAttempt(`auth:legacy-verify:${ip}`)

  if (!rateLimit.allowed) {
    return new Response(null, {
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    })
  }

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const user = await getUserByEmail(parsed.data.email)

  if (!user?.password) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.password)
  if (!isValid) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  return NextResponse.json({
    valid: true,
    name: user.name ?? "SPAY User",
  })
}
