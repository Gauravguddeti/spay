import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
  refreshAccessTokenIfNeeded,
  scanGmailForSubscriptions,
} from "@/lib/integrations/gmail"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.accessToken) {
      return NextResponse.json(
        {
          error: "GMAIL_NOT_CONNECTED",
          message: "Please connect your Gmail account first",
        },
        { status: 401 },
      )
    }

    // Refresh token if expiring within 5 minutes
    let freshTokens: { accessToken: string; accessTokenExpiresAt: number }
    try {
      freshTokens = await refreshAccessTokenIfNeeded({
        accessToken: session.user.accessToken,
        refreshToken: session.user.refreshToken ?? "",
        accessTokenExpiresAt: session.user.accessTokenExpiresAt ?? 0,
      })
    } catch (refreshError) {
      const err = refreshError as { code?: string; message?: string }
      if (err.code === "GMAIL_AUTH_EXPIRED") {
        return NextResponse.json(
          { error: "GMAIL_AUTH_EXPIRED", message: err.message },
          { status: 401 },
        )
      }
      throw refreshError
    }

    const detected = await scanGmailForSubscriptions(freshTokens.accessToken)

    return NextResponse.json({ subscriptions: detected })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
