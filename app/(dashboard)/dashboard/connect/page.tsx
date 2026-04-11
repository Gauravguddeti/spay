import { auth } from "@/auth"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { sql } from "drizzle-orm"
import { eq, and } from "drizzle-orm"
import { ConnectPageClient } from "@/components/dashboard/connect-page"

export default async function ConnectPage() {
  const session = await auth()

  let isConnected = false
  if (session?.user?.id && session.user.email) {
    const email = session.user.email.trim().toLowerCase()

    const neonAccountResult = await db.execute(sql`
      select 1
      from neon_auth.account a
      join neon_auth."user" u on u.id = a."userId"
      where lower(u.email) = ${email}
        and a."providerId" = 'google'
      limit 1
    `)

    const hasNeonGoogleAccount =
      ((neonAccountResult as unknown as { rows?: Array<{ [key: string]: unknown }> }).rows?.length ?? 0) > 0

    if (hasNeonGoogleAccount) {
      isConnected = true
    } else {
      const acc = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
        .limit(1)
      isConnected = acc.length > 0
    }
  }

  const gmailEnabled = true

  return <ConnectPageClient gmailEnabled={gmailEnabled} initialConnected={isConnected} />
}
