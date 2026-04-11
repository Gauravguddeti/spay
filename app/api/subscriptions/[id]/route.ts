import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  deleteSubscription,
  updateSubscription,
} from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { subscriptions } from "@/lib/db/schema"

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional().nullable(),
  amountInr: z.coerce.number().positive().optional(),
  billingCycle: z.enum(["monthly", "annual", "one-time"]).optional(),
  nextRenewalDate: z.string().optional().nullable(),
  status: z.enum(["active", "cancelled", "paused"]).optional(),
  detectedVia: z.enum(["manual", "gmail", "bank_statement"]).optional(),
  lastUsedAt: z.string().optional().nullable(),
  cancelledAt: z.string().optional().nullable(),
  cancellationVerified: z.boolean().optional(),
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

async function getOrgForRequest() {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!session.user.orgId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  const organization = await getOrganizationByOwnerId(session.user.id, session.user.orgId)

  if (!organization) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { sessionOrgId: session.user.orgId }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const orgResult = await getOrgForRequest()
    if (orgResult.error) {
      return orgResult.error
    }

    const { id } = await context.params
    const [existing] = await db
      .select({ id: subscriptions.id, orgId: subscriptions.orgId, detectedVia: subscriptions.detectedVia })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    if (existing.orgId !== orgResult.sessionOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const payload = await request.json()
    const parsed = updateSubscriptionSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const effectiveDetectedVia = parsed.data.detectedVia ?? existing.detectedVia ?? "manual"
    if (effectiveDetectedVia === "manual" && parsed.data.nextRenewalDate) {
      const renewalDate = toDateOnly(parsed.data.nextRenewalDate)
      if (renewalDate < getTodayDateStringLocal()) {
        return NextResponse.json(
          { error: "Renewal date cannot be earlier than today" },
          { status: 400 },
        )
      }
    }

    const updated = await updateSubscription(id, orgResult.sessionOrgId, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.amountInr !== undefined ? { amountInr: parsed.data.amountInr.toFixed(2) } : {}),
      ...(parsed.data.billingCycle !== undefined ? { billingCycle: parsed.data.billingCycle } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.detectedVia !== undefined ? { detectedVia: parsed.data.detectedVia } : {}),
      ...(parsed.data.nextRenewalDate !== undefined
        ? {
            nextRenewalDate: parsed.data.nextRenewalDate
              ? new Date(parsed.data.nextRenewalDate)
              : null,
          }
        : {}),
      ...(parsed.data.lastUsedAt !== undefined
        ? {
            lastUsedAt: parsed.data.lastUsedAt ? new Date(parsed.data.lastUsedAt) : null,
          }
        : {}),
      ...(parsed.data.cancelledAt !== undefined
        ? {
            cancelledAt: parsed.data.cancelledAt ? new Date(parsed.data.cancelledAt) : null,
          }
        : {}),
      ...(parsed.data.cancellationVerified !== undefined
        ? { cancellationVerified: parsed.data.cancellationVerified }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const orgResult = await getOrgForRequest()
    if (orgResult.error) {
      return orgResult.error
    }

    const { id } = await context.params
    const [existing] = await db
      .select({ id: subscriptions.id, orgId: subscriptions.orgId })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    if (existing.orgId !== orgResult.sessionOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await deleteSubscription(id, orgResult.sessionOrgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}