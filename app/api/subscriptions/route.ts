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
  notes: z.string().max(500).optional().nullable(),
})

function getTodayDateStringLocal() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toDateOnly(value: string) {
  return value.slice(0, 10)
}

export async function POST(request: Request) {
  try {
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

    const payload = await request.json()
    const parsed = createSubscriptionSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const effectiveDetectedVia = parsed.data.detectedVia ?? "manual"
    if (effectiveDetectedVia === "manual" && parsed.data.nextRenewalDate) {
      const renewalDate = toDateOnly(parsed.data.nextRenewalDate)
      if (renewalDate < getTodayDateStringLocal()) {
        return NextResponse.json(
          { error: "Renewal date cannot be earlier than today" },
          { status: 400 },
        )
      }
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
      notes: parsed.data.notes ?? null,
    })

    return NextResponse.json({ subscription: created }, { status: 201 })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}