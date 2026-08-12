import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import {
  refreshAccessTokenIfNeeded,
  scanGmailForSubscriptions,
} from "@/lib/integrations/gmail"
import { decryptTokenWithCompatibility, encryptToken } from "@/lib/security/tokenCrypto"

function isGmailReconnectError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  if (err?.code === "GMAIL_AUTH_EXPIRED") {
    return true
  }

  const message = String(err?.message ?? "").toLowerCase()
  return (
    message.includes("gmail list failed: 401") ||
    message.includes("invalid credentials") ||
    message.includes("invalid token") ||
    message.includes("invalid_grant") ||
    message.includes("insufficient authentication scopes")
  )
}

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = session.user.email.trim().toLowerCase()

    let neonAccount:
      | {
        id: string
        userId: string
        accountId: string
        accessToken: string | null
        refreshToken: string | null
        accessTokenExpiresAt: Date | string | null
      }
      | undefined

    try {
      const neonAccountResult = await db.execute(sql`
        select
          a.id,
          a."userId",
          a."accountId",
          a."accessToken",
          a."refreshToken",
          a."accessTokenExpiresAt"
        from neon_auth.account a
        join neon_auth."user" u on u.id = a."userId"
        where lower(u.email) = ${email}
          and a."providerId" = 'google'
        order by a."updatedAt" desc
        limit 1
      `)

      neonAccount = (neonAccountResult as unknown as {
        rows?: Array<{
          id: string
          userId: string
          accountId: string
          accessToken: string | null
          refreshToken: string | null
          accessTokenExpiresAt: Date | string | null
        }>
      }).rows?.[0]
    } catch (neonLookupError) {
      Sentry.captureException(neonLookupError)
    }

    if (neonAccount?.accessToken) {
      const accessTokenExpiresAt = neonAccount.accessTokenExpiresAt
        ? new Date(neonAccount.accessTokenExpiresAt).getTime()
        : 0

      let freshTokens: { accessToken: string; accessTokenExpiresAt: number }
      try {
        freshTokens = await refreshAccessTokenIfNeeded({
          accessToken: neonAccount.accessToken,
          refreshToken: neonAccount.refreshToken ?? "",
          accessTokenExpiresAt,
        })

        if (
          freshTokens.accessToken !== neonAccount.accessToken ||
          freshTokens.accessTokenExpiresAt !== accessTokenExpiresAt
        ) {
          await db.execute(sql`
            update neon_auth.account
            set
              "accessToken" = ${freshTokens.accessToken},
              "accessTokenExpiresAt" = ${new Date(freshTokens.accessTokenExpiresAt)}
            where id = ${neonAccount.id}
          `)
        }
      } catch (refreshError) {
        const err = refreshError as { code?: string }
        if (err.code === "GMAIL_AUTH_EXPIRED") {
          return NextResponse.json({ error: "GMAIL_AUTH_EXPIRED" }, { status: 401 })
        }
        throw refreshError
      }

      let detected
      try {
        detected = await scanGmailForSubscriptions(freshTokens.accessToken, session.user.orgId)
      } catch (scanError) {
        if (isGmailReconnectError(scanError)) {
          return NextResponse.json({ error: "GMAIL_AUTH_EXPIRED" }, { status: 401 })
        }
        throw scanError
      }
      return NextResponse.json({ subscriptions: detected })
    }

    const canEncryptTokens = Boolean(process.env.TOKEN_ENCRYPTION_KEY)

    // Legacy fallback path for users with old provider rows in public.accounts.
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

      // Persist tokens; encrypt when TOKEN_ENCRYPTION_KEY is configured.
      if (freshTokens.accessToken !== accessToken || usedLegacyPlaintext) {
        const storedAccessToken = canEncryptTokens
          ? await encryptToken(freshTokens.accessToken)
          : freshTokens.accessToken
        const storedRefreshToken = refreshToken
          ? canEncryptTokens
            ? await encryptToken(refreshToken)
            : refreshToken
          : null

        await db
          .update(accounts)
          .set({
            access_token: storedAccessToken,
            refresh_token: storedRefreshToken,
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

    let detected
    try {
      detected = await scanGmailForSubscriptions(freshTokens.accessToken, session.user.orgId)
    } catch (scanError) {
      if (isGmailReconnectError(scanError)) {
        return NextResponse.json({ error: "GMAIL_AUTH_EXPIRED" }, { status: 401 })
      }
      throw scanError
    }

    return NextResponse.json({ subscriptions: detected })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
