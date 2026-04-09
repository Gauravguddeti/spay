import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import {
  deleteSubscription,
  getSubscriptionByIdForOrg,
  updateSubscription,
} from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional().nullable(),
  amountInr: z.coerce.number().positive().optional(),
  billingCycle: z.enum(["monthly", "annual", "one-time"]).optional(),
  nextRenewalDate: z.string().optional().nullable(),
  status: z.enum(["active", "cancelled", "paused"]).optional(),
  addedVia: z.enum(["manual", "pdf", "email"]).optional(),
  lastUsedAt: z.string().optional().nullable(),
})

async function getOrgForRequest() {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const organization = await getOrganizationByOwnerId(session.user.id)

  if (!organization) {
    return { error: NextResponse.json({ error: "Organization not found" }, { status: 404 }) }
  }

  return { organization }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const orgResult = await getOrgForRequest()
  if (orgResult.error) {
    return orgResult.error
  }

  const { id } = await context.params
  const existing = await getSubscriptionByIdForOrg(id, orgResult.organization.id)

  if (!existing) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

  const payload = await request.json()
  const parsed = updateSubscriptionSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    )
  }

  const updated = await updateSubscription(id, orgResult.organization.id, {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
    ...(parsed.data.amountInr !== undefined ? { amountInr: parsed.data.amountInr.toFixed(2) } : {}),
    ...(parsed.data.billingCycle !== undefined ? { billingCycle: parsed.data.billingCycle } : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.addedVia !== undefined ? { addedVia: parsed.data.addedVia } : {}),
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
  })

  return NextResponse.json({ subscription: updated })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const orgResult = await getOrgForRequest()
  if (orgResult.error) {
    return orgResult.error
  }

  const { id } = await context.params
  const existing = await getSubscriptionByIdForOrg(id, orgResult.organization.id)

  if (!existing) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

  await deleteSubscription(id, orgResult.organization.id)
  return NextResponse.json({ success: true })
}