import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { ReconciliationQueue } from "@/components/dashboard/reconciliation-queue"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Reconciliation — SPAY",
  description: "Match bank transactions against tracked subscriptions and resolve discrepancies.",
}

async function getQueueData(orgId: string) {
  // Server-side fetch against own API (avoids duplicating DB query logic)
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  try {
    const res = await fetch(`${baseUrl}/api/reconciliation/queue`, {
      cache: "no-store",
      headers: { Cookie: "" }, // will be overridden by Next.js server context cookies
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function ReconciliationPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const org = await getOrganizationByOwnerId(session.user.id)
  if (!org) redirect("/login")

  // Fetch queue directly from DB via the API route
  // We import the db query inline here for SSR to avoid cookie threading issues
  const { db } = await import("@/lib/db")
  const { bankTransactions, reconciliationMatches, subscriptions } = await import("@/lib/db/schema")
  const { eq, desc } = await import("drizzle-orm")

  const rows = await db
    .select({
      matchId: reconciliationMatches.id,
      status: reconciliationMatches.status,
      confidenceScore: reconciliationMatches.confidenceScore,
      matchReason: reconciliationMatches.matchReason,
      createdAt: reconciliationMatches.createdAt,
      resolvedAt: reconciliationMatches.resolvedAt,
      resolvedBy: reconciliationMatches.resolvedBy,
      txId: bankTransactions.id,
      txVendorRaw: bankTransactions.vendorRaw,
      txVendorNormalized: bankTransactions.vendorNormalized,
      txAmount: bankTransactions.amount,
      txCurrency: bankTransactions.currency,
      txDate: bankTransactions.date,
      txSource: bankTransactions.source,
      subId: subscriptions.id,
      subName: subscriptions.name,
      subAmountInr: subscriptions.amountInr,
      subStatus: subscriptions.status,
      subBillingCycle: subscriptions.billingCycle,
    })
    .from(reconciliationMatches)
    .innerJoin(bankTransactions, eq(reconciliationMatches.bankTransactionId, bankTransactions.id))
    .leftJoin(subscriptions, eq(reconciliationMatches.subscriptionId, subscriptions.id))
    .where(eq(bankTransactions.orgId, org.id))
    .orderBy(desc(reconciliationMatches.createdAt))

  // Serialize dates to strings for client component
  const serializedRows = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    txDate: r.txDate ? (r.txDate instanceof Date ? r.txDate.toISOString().slice(0, 10) : String(r.txDate)) : null,
  }))

  const queue = {
    matched: serializedRows.filter((r) => r.status === "matched"),
    needs_review: serializedRows.filter((r) => r.status === "needs_review"),
    unmatched: serializedRows.filter((r) => r.status === "unmatched"),
    resolved: serializedRows.filter((r) => r.status === "resolved"),
  }

  const initialData = {
    queue,
    counts: {
      matched: queue.matched.length,
      needs_review: queue.needs_review.length,
      unmatched: queue.unmatched.length,
      resolved: queue.resolved.length,
      total: rows.length,
    },
  }

  return (
    <div className="p-4 md:p-6">
      <ReconciliationQueue initialData={initialData} />
    </div>
  )
}
