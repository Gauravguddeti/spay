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
import { decryptTokenWithCompatibility, encryptToken } from "@/lib/security/tokenCrypto"

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

    let accessToken = ""
    let refreshToken = ""
    let usedLegacyPlaintext = false

    try {
      const accessTokenResult = await decryptTokenWithCompatibility(account.access_token)
      accessToken = accessTokenResult.token
      usedLegacyPlaintext = usedLegacyPlaintext || accessTokenResult.usedLegacyPlaintext

      if (account.refresh_token) {
        const refreshTokenResult = await decryptTokenWithCompatibility(account.refresh_token)
        refreshToken = refreshTokenResult.token
        usedLegacyPlaintext = usedLegacyPlaintext || refreshTokenResult.usedLegacyPlaintext
      }
    } catch (decryptError) {
      Sentry.captureException(decryptError)
      await db
        .update(accounts)
        .set({
          access_token: null,
          refresh_token: null,
          expires_at: null,
        })
        .where(
          and(
            eq(accounts.userId, session.user.id),
            eq(accounts.provider, "google"),
            eq(accounts.providerAccountId, account.providerAccountId),
          ),
        )

      return NextResponse.json({ error: "GMAIL_AUTH_EXPIRED" }, { status: 401 })
    }

    // Refresh token if expiring within 5 minutes
    let freshTokens: { accessToken: string; accessTokenExpiresAt: number }
    try {
      freshTokens = await refreshAccessTokenIfNeeded({
        accessToken,
        refreshToken,
        accessTokenExpiresAt: account.expires_at ? account.expires_at * 1000 : 0,
      })

      // Persist encrypted tokens when refreshed or when migrating legacy plaintext.
      if (freshTokens.accessToken !== accessToken || usedLegacyPlaintext) {
        const encryptedAccessToken = await encryptToken(freshTokens.accessToken)
        const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null

        await db
          .update(accounts)
          .set({
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            expires_at: Math.floor(freshTokens.accessTokenExpiresAt / 1000),
          })
          .where(
            and(
              eq(accounts.userId, session.user.id),
              eq(accounts.provider, "google"),
              eq(accounts.providerAccountId, account.providerAccountId),
            ),
          )
      }
    } catch (refreshError) {
      const err = refreshError as { code?: string; message?: string }
      if (err.code === "GMAIL_AUTH_EXPIRED") {
        return NextResponse.json({ error: "GMAIL_AUTH_EXPIRED" }, { status: 401 })
      }
      throw refreshError
    }

    const detected = await scanGmailForSubscriptions(freshTokens.accessToken)

    return NextResponse.json({ subscriptions: detected })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
