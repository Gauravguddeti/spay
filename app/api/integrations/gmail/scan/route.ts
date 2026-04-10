import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
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

    const accountList = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
      .limit(1)

    const account = accountList[0]

    if (!account || !account.access_token) {
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
        accessToken: account.access_token,
        refreshToken: account.refresh_token ?? "",
        accessTokenExpiresAt: account.expires_at ? account.expires_at * 1000 : 0,
      })

      // If we got fresh tokens, optionally update the DB
      if (freshTokens.accessToken !== account.access_token) {
        await db
          .update(accounts)
          .set({
            access_token: freshTokens.accessToken,
            expires_at: Math.floor(freshTokens.accessTokenExpiresAt / 1000),
          })
          .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, account.providerAccountId)))
      }
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
