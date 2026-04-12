import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { and, eq, isNull, sql } from "drizzle-orm"
import { differenceInCalendarDays } from "date-fns"

import { db } from "@/lib/db"
import { organizations, renewalAlerts, subscriptions, users } from "@/lib/db/schema"
import { sendWhatsAppAlert } from "@/lib/notifications/whatsapp"
import type { AlertPreferences } from "@/lib/db/schema"

/**
 * POST /api/alerts/send
 *
 * Queries all unsent renewal_alerts where alert_date = today, sends WhatsApp
 * messages, and marks them as sent. Called by Vercel Cron at 3:30 AM UTC (9 AM IST).
 *
 * Protected by CRON_SECRET header to prevent unauthorized invocation.
 */
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const todayStr = new Date().toISOString().slice(0, 10)

    // Query all unsent alerts due today, joined with subscription + org + user
    const alertRows = await db
      .select({
        alertId: renewalAlerts.id,
        alertDate: renewalAlerts.alertDate,
        subscriptionName: subscriptions.name,
        amountInr: subscriptions.amountInr,
        billingCycle: subscriptions.billingCycle,
        nextRenewalDate: subscriptions.nextRenewalDate,
        orgId: subscriptions.orgId,
        whatsappNumber: organizations.whatsappNumber,
        alertPreferences: organizations.alertPreferences,
        userName: users.name,
      })
      .from(renewalAlerts)
      .innerJoin(subscriptions, eq(renewalAlerts.subscriptionId, subscriptions.id))
      .innerJoin(organizations, eq(subscriptions.orgId, organizations.id))
      .leftJoin(users, eq(organizations.ownerId, users.id))
      .where(
        and(
          sql`${renewalAlerts.alertDate}::date = ${todayStr}::date`,
          isNull(renewalAlerts.sentAt),
        ),
      )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://spay.vercel.app"
    let sent = 0
    let failed = 0

    for (const row of alertRows) {
      const renewalDate = row.nextRenewalDate
        ? new Date(row.nextRenewalDate)
        : null
      const alertDate = row.alertDate ? new Date(row.alertDate) : null
      const daysBeforeRenewal =
        renewalDate && alertDate
          ? differenceInCalendarDays(renewalDate, alertDate)
          : null

      const prefs = row.alertPreferences as AlertPreferences | null
      if (prefs && daysBeforeRenewal !== null) {
        const isTimingEnabled =
          daysBeforeRenewal === 30
            ? prefs.days30
            : daysBeforeRenewal === 7
              ? prefs.days7
              : daysBeforeRenewal === 1
                ? prefs.days1
                : true

        if (!isTimingEnabled) {
          await db
            .update(renewalAlerts)
            .set({
              sentAt: new Date(),
              metadata: { skipped_reason: "preference_disabled" },
            })
            .where(eq(renewalAlerts.id, row.alertId))
          continue
        }
      }

      if (!row.whatsappNumber) {
        console.warn(`Alert skipped: org ${row.orgId} has no WhatsApp number`)
        Sentry.captureMessage(`Alert skipped: org ${row.orgId} has no WhatsApp number`)
        continue
      }

      const daysUntil = renewalDate
        ? differenceInCalendarDays(renewalDate, new Date())
        : null

      const daysStr =
        daysUntil === 0
          ? "today"
          : daysUntil === 1
            ? "tomorrow"
            : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`

      const amountFormatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(row.amountInr))

      const message = [
        `Hey ${row.userName ?? "there"} 👋`,
        `*${row.subscriptionName}* renews ${daysStr} for ${amountFormatted}.`,
        `Log in to review: ${appUrl}/dashboard/subscriptions`,
      ].join("\n")

      try {
        await sendWhatsAppAlert(row.whatsappNumber, message)

        // Mark alert as sent — only on success (Correction 4)
        await db
          .update(renewalAlerts)
          .set({ sentAt: new Date() })
          .where(eq(renewalAlerts.id, row.alertId))

        sent++
      } catch (sendError) {
        // Do NOT mark as sent so it retries on the next cron run
        Sentry.captureException(sendError, {
          extra: { alertId: row.alertId, subscriptionName: row.subscriptionName },
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed: alertRows.length,
      sent,
      failed,
    })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
