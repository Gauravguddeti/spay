import { auth } from "@/auth"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { sql } from "drizzle-orm"
import { eq, and } from "drizzle-orm"
import { ConnectPageClient } from "@/components/dashboard/connect-page"

function hasGmailReadonlyScope(scope: unknown): boolean {
  if (typeof scope !== "string") {
    return false
  }

  return scope.toLowerCase().includes("gmail.readonly")
}

export default async function ConnectPage() {
  const session = await auth()

  let isConnected = false
  if (session?.user?.id && session.user.email) {
    const email = session.user.email.trim().toLowerCase()

    const neonAccountResult = await db.execute(sql`
      select a."scope"
      from neon_auth.account a
      join neon_auth."user" u on u.id = a."userId"
      where lower(u.email) = ${email}
        and a."providerId" = 'google'
      order by a."updatedAt" desc
      limit 1
    `)

    const neonGoogleAccount = (neonAccountResult as unknown as {
      rows?: Array<{ scope?: string | null }>
    }).rows?.[0]
    const hasNeonGoogleAccount = Boolean(neonGoogleAccount)

    if (hasNeonGoogleAccount) {
      if (typeof neonGoogleAccount?.scope === "string" && neonGoogleAccount.scope.trim().length > 0) {
        isConnected = hasGmailReadonlyScope(neonGoogleAccount.scope)
      } else {
        // TODO: If scope metadata is unavailable in Neon Auth rows, add a provider-side scope verification fallback.
        isConnected = false
      }
    } else {
      const acc = await db
        .select({ scope: accounts.scope })
        .from(accounts)
        .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
        .limit(1)

      if (acc.length > 0) {
        if (typeof acc[0]?.scope === "string" && acc[0].scope.trim().length > 0) {
          isConnected = hasGmailReadonlyScope(acc[0].scope)
        } else {
          // TODO: Legacy accounts without scopes should trigger a reconnect to capture gmail.readonly consent.
          isConnected = false
        }
      }
    }
  }

  const gmailEnabled = true

  return <ConnectPageClient gmailEnabled={gmailEnabled} initialConnected={isConnected} />
}
