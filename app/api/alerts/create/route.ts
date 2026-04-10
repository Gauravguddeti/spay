import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { renewalAlerts, subscriptions } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { addDays } from "date-fns"
import { eq } from "drizzle-orm"

const createAlertSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID"),
  alertTiming: z.union([z.literal(30), z.literal(7), z.literal(1)]),
})

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
    const parsed = createAlertSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const [subscription] = await db
      .select({
        id: subscriptions.id,
        orgId: subscriptions.orgId,
        nextRenewalDate: subscriptions.nextRenewalDate,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, parsed.data.subscriptionId))
      .limit(1)

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    if (subscription.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!subscription.nextRenewalDate) {
      return NextResponse.json(
        { error: "Subscription has no renewal date set" },
        { status: 422 },
      )
    }

    const alertDate = addDays(
      new Date(subscription.nextRenewalDate),
      -parsed.data.alertTiming,
    )

    const [created] = await db
      .insert(renewalAlerts)
      .values({
        subscriptionId: subscription.id,
        alertDate,
      })
      .returning()

    return NextResponse.json({ alert: created }, { status: 201 })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
