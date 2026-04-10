import { NextRequest } from "next/server"

import { handlers } from "@/auth"
import { getClientIpFromHeaders, takeRateLimitAttempt } from "@/lib/security/inMemoryRateLimit"

export const GET = handlers.GET

export async function POST(
	request: NextRequest,
	_context: { params: Promise<{ nextauth: string[] }> },
) {
	const isCredentialsSignIn = request.nextUrl.pathname.includes("/api/auth/callback/credentials")

	if (isCredentialsSignIn) {
		const ip = getClientIpFromHeaders(request.headers)
		const rateLimit = takeRateLimitAttempt(`auth:credentials:${ip}`)

		if (!rateLimit.allowed) {
			return new Response(null, {
				status: 429,
				headers: {
					"Retry-After": String(rateLimit.retryAfterSeconds),
				},
			})
		}
	}

	return handlers.POST(request)
}