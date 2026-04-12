import { NextRequest, NextResponse } from "next/server"
import { differenceInDays, addDays } from "date-fns"
import { inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { getSubscriptionsByOrgIds } from "@/lib/db/queries/subscriptions"
import { organizations, users } from "@/lib/db/schema"
import { sendWeeklyDigest } from "@/lib/email/sendDigest"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET and Vercel cron header.
  const authHeader = req.headers.get("authorization")
  const cronHeader = req.headers.get("x-vercel-cron")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}` || !cronHeader) {
    return new Response(null, { status: 401 })
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://spay.app"
  const today = new Date()
  const weekAhead = addDays(today, 7)

  try {
    const orgs = await db
      .select({
        id: organizations.id,
        ownerId: organizations.ownerId,
      })
      .from(organizations)

    const results: Array<{ orgId: string; status: string }> = []

    const orgIds = orgs.map((org) => org.id)
    const ownerIds = Array.from(new Set(orgs.flatMap((org) => (org.ownerId ? [org.ownerId] : []))))

    const [owners, orgSubscriptions] = await Promise.all([
      ownerIds.length > 0
        ? db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
            })
            .from(users)
            .where(inArray(users.id, ownerIds))
        : Promise.resolve([]),
      getSubscriptionsByOrgIds(orgIds),
    ])

    const ownersById = new Map(owners.map((owner) => [owner.id, owner]))
    const subscriptionsByOrgId = new Map<string, (typeof orgSubscriptions)[number][]>()

    for (const subscription of orgSubscriptions) {
      if (subscription.status !== "active") continue

      const existing = subscriptionsByOrgId.get(subscription.orgId)
      if (existing) {
        existing.push(subscription)
      } else {
        subscriptionsByOrgId.set(subscription.orgId, [subscription])
      }
    }

    for (const org of orgs) {
      try {
        // Find owner's email
        if (!org.ownerId) continue
        const user = ownersById.get(org.ownerId)
        if (!user?.email) continue

        // Fetch active subscriptions for org from batched query results
        const subs = subscriptionsByOrgId.get(org.id) ?? []

        // Total monthly spend
        const monthlySpend = subs.reduce((acc, s) => {
          const amount = Number(s.amountInr)
          return acc + (s.billingCycle === "annual" ? amount / 12 : amount)
        }, 0)

        // Renewals this week
        const renewals = subs
          .filter((s) => {
            if (!s.nextRenewalDate) return false
            const d = new Date(s.nextRenewalDate)
            return d >= today && d <= weekAhead
          })
          .map((s) => ({
            name: s.name,
            amountInr: Number(s.amountInr),
            renewalDate: s.nextRenewalDate
              ? new Date(s.nextRenewalDate).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })
              : "—",
          }))

        // Top saving opportunity: highest cost unused sub
        const unusedSubs = subs
          .filter((s) => s.lastUsedAt && differenceInDays(today, new Date(s.lastUsedAt)) >= 45)
          .sort((a, b) => Number(b.amountInr) - Number(a.amountInr))

        const savingOpportunity = unusedSubs[0]
          ? {
              name: unusedSubs[0].name,
              amountInr: Number(unusedSubs[0].amountInr),
              unusedDays: differenceInDays(today, new Date(unusedSubs[0].lastUsedAt!)),
            }
          : null

        await sendWeeklyDigest({
          to: user.email,
          userName: user.name ?? "there",
          monthlySpend,
          renewals,
          savingOpportunity,
          appUrl,
        })

        results.push({ orgId: org.id, status: "sent" })
      } catch (err) {
        console.error(err)
        results.push({ orgId: org.id, status: "error" })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
