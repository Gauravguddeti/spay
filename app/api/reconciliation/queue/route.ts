import { NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { bankTransactions, reconciliationMatches, subscriptions } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await getOrganizationByOwnerId(session.user.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Join reconciliation_matches → bank_transactions → subscriptions
    const rows = await db
      .select({
        matchId: reconciliationMatches.id,
        status: reconciliationMatches.status,
        confidenceScore: reconciliationMatches.confidenceScore,
        matchReason: reconciliationMatches.matchReason,
        createdAt: reconciliationMatches.createdAt,
        resolvedAt: reconciliationMatches.resolvedAt,
        resolvedBy: reconciliationMatches.resolvedBy,
        // Bank transaction
        txId: bankTransactions.id,
        txVendorRaw: bankTransactions.vendorRaw,
        txVendorNormalized: bankTransactions.vendorNormalized,
        txAmount: bankTransactions.amount,
        txCurrency: bankTransactions.currency,
        txDate: bankTransactions.date,
        txSource: bankTransactions.source,
        // Matched subscription (nullable)
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

    // Group by status
    const queue = {
      matched: [] as typeof rows,
      needs_review: [] as typeof rows,
      unmatched: [] as typeof rows,
      resolved: [] as typeof rows,
    }

    for (const row of rows) {
      const key = row.status as keyof typeof queue
      if (queue[key]) queue[key].push(row)
    }

    return NextResponse.json({
      queue,
      counts: {
        matched: queue.matched.length,
        needs_review: queue.needs_review.length,
        unmatched: queue.unmatched.length,
        resolved: queue.resolved.length,
        total: rows.length,
      },
    })
  } catch (error) {
    console.error("[reconciliation/queue]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
