import { type NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { bankTransactions, reconciliationMatches } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const PatchSchema = z.object({
  status: z.enum(["resolved", "matched", "unmatched"]),
  subscriptionId: z.string().uuid().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const org = await getOrganizationByOwnerId(session.user.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify this match belongs to the org (via the bank_transaction)
    const [existing] = await db
      .select({ id: reconciliationMatches.id })
      .from(reconciliationMatches)
      .innerJoin(
        bankTransactions,
        eq(reconciliationMatches.bankTransactionId, bankTransactions.id),
      )
      .where(
        and(
          eq(reconciliationMatches.id, id),
          eq(bankTransactions.orgId, org.id),
        ),
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { status, subscriptionId } = parsed.data

    const [updated] = await db
      .update(reconciliationMatches)
      .set({
        status,
        subscriptionId: subscriptionId ?? null,
        resolvedAt: status === "resolved" ? new Date() : null,
        resolvedBy: status === "resolved" ? session.user.id : null,
      })
      .where(eq(reconciliationMatches.id, id))
      .returning()

    return NextResponse.json({ match: updated })
  } catch (error) {
    console.error("[reconciliation/[id]]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
