import { NextRequest, NextResponse } from "next/server"
import { differenceInDays, addDays } from "date-fns"
import { db } from "@/lib/db"
import { organizations, subscriptions, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
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
    const orgs = await db.select().from(organizations)
    const results: Array<{ orgId: string; status: string }> = []

    for (const org of orgs) {
      try {
        // Find owner's email
        if (!org.ownerId) continue
        const [user] = await db.select().from(users).where(eq(users.id, org.ownerId)).limit(1)
        if (!user?.email) continue

        // Fetch all active subscriptions for org
        const subs = await db
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.orgId, org.id), eq(subscriptions.status, "active")))

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
