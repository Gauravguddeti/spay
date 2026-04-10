import { auth } from "@/auth"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { ConnectPageClient } from "@/components/dashboard/connect-page"

export default async function ConnectPage() {
  const session = await auth()
  
  let isConnected = false
  if (session?.user?.id) {
    const acc = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
      .limit(1)
    isConnected = acc.length > 0
  }

  const gmailEnabled = Boolean(
    (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) &&
      (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET),
  )

  return <ConnectPageClient gmailEnabled={gmailEnabled} initialConnected={isConnected} />
}
