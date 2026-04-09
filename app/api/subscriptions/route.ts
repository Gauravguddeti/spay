import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { addSubscription } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  category: z.string().min(1).optional().nullable(),
  amountInr: z.coerce.number().positive("Amount must be greater than zero"),
  billingCycle: z.enum(["monthly", "annual", "one-time"]),
  nextRenewalDate: z.string().optional().nullable(),
  status: z.enum(["active", "cancelled", "paused"]).optional(),
  detectedVia: z.enum(["manual", "gmail", "bank_statement"]).optional(),
  lastUsedAt: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organization = await getOrganizationByOwnerId(session.user.id)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const payload = await request.json()
    const parsed = createSubscriptionSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const created = await addSubscription({
      orgId: organization.id,
      name: parsed.data.name,
      category: parsed.data.category,
      amountInr: parsed.data.amountInr.toFixed(2),
      billingCycle: parsed.data.billingCycle,
      status: parsed.data.status ?? "active",
      detectedVia: parsed.data.detectedVia ?? "manual",
      nextRenewalDate: parsed.data.nextRenewalDate ? new Date(parsed.data.nextRenewalDate) : null,
      lastUsedAt: parsed.data.lastUsedAt ? new Date(parsed.data.lastUsedAt) : null,
    })

    return NextResponse.json({ subscription: created }, { status: 201 })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}