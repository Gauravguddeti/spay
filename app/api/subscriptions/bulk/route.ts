import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { addSubscription } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const BulkItemSchema = z.object({
  name: z.string().min(1),
  amountInr: z.number().positive(),
  category: z.string().optional(),
  date: z.string().nullable().optional(),
  detectedVia: z.enum(["pdf", "gmail", "bank_statement", "manual"]).default("pdf"),
  originalAmount: z.number().optional(),
  originalCurrency: z.string().optional(),
})

const BulkBodySchema = z.object({
  subscriptions: z.array(BulkItemSchema).min(1).max(100),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const organization = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = BulkBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { subscriptions } = parsed.data

  const inserted = await Promise.all(
    subscriptions.map((sub) =>
      addSubscription({
        orgId: organization.id,
        name: sub.name,
        category: sub.category ?? null,
        amountInr: String(sub.amountInr),
        billingCycle: "monthly",
        nextRenewalDate: sub.date ? new Date(sub.date) : null,
        status: "active",
        detectedVia: sub.detectedVia === "pdf" ? "bank_statement" : sub.detectedVia === "gmail" ? "gmail" : "manual",
        originalAmount: sub.originalAmount ? String(sub.originalAmount) : null,
        originalCurrency: sub.originalCurrency ?? "INR",
        usageStatus: "unknown",
      }),
    ),
  )

  return NextResponse.json({ inserted: inserted.length })
}
