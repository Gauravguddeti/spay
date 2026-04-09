import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { renewalAlerts, subscriptions } from "@/lib/db/schema"
import { getSubscriptionByIdForOrg } from "@/lib/db/queries/subscriptions"
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

    const organization = await getOrganizationByOwnerId(session.user.id)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const payload = await request.json()
    const parsed = createAlertSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const subscription = await getSubscriptionByIdForOrg(
      parsed.data.subscriptionId,
      organization.id,
    )

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
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
