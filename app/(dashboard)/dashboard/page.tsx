import { redirect } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"

import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, getUpcomingRenewals } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 3) return "bg-red-100 text-red-800 border-red-200"
  if (daysLeft <= 7) return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-emerald-100 text-emerald-800 border-emerald-200"
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID

  let stats = {
    totalMonthlySpendInr: 0,
    activeSubscriptionsCount: 0,
    renewingThisMonthCount: 0,
    potentialSavingsCount: 0,
    potentialSavingsInr: 0,
  }
  let upcomingRenewals: Awaited<ReturnType<typeof getUpcomingRenewals>> = []

  if (!isTempLocalUser) {
    try {
      const organization = await getOrganizationByOwnerId(session.user.id)

      if (!organization) {
        redirect("/login")
      }

      ;[stats, upcomingRenewals] = await Promise.all([
        getDashboardStats(organization.id),
        getUpcomingRenewals(organization.id),
      ])
    } catch {
      stats = {
        totalMonthlySpendInr: 0,
        activeSubscriptionsCount: 0,
        renewingThisMonthCount: 0,
        potentialSavingsCount: 0,
        potentialSavingsInr: 0,
      }
      upcomingRenewals = []
    }
  }

  const next3Renewals = upcomingRenewals.slice(0, 3)
  const today = new Date()

  const cards = [
    {
      title: "Total Monthly Spend",
      value: formatInr(stats.totalMonthlySpendInr),
      description: "Active monthly + annual/12",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptionsCount.toString(),
      description: "Currently billing tools",
    },
    {
      title: "Renewing This Month",
      value: stats.renewingThisMonthCount.toString(),
      description: "Next 30 days",
    },
    {
      title: "Potential Savings",
      value: `${stats.potentialSavingsCount} tools · ${formatInr(stats.potentialSavingsInr)}`,
      description: "Unused for 45+ days",
    },
  ]

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">SPEND OVERVIEW</p>
        <h1 className="mt-2 font-serif text-3xl">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card className="rounded-3xl border-border/70" key={card.title}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-mono uppercase tracking-wide">
                {card.title}
              </CardDescription>
              <CardTitle className="font-serif text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Renewals card */}
      {next3Renewals.length > 0 && (
        <Card className="rounded-3xl border-border/70">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-mono uppercase tracking-wide">
              UPCOMING RENEWALS
            </CardDescription>
            <CardTitle className="font-serif text-xl">Next 3 Renewals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {next3Renewals.map((renewal) => {
              if (!renewal.nextRenewalDate) return null
              const renewalDate = new Date(renewal.nextRenewalDate)
              const daysLeft = differenceInCalendarDays(renewalDate, today)
              const isToday = daysLeft === 0

              return (
                <div
                  className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3"
                  key={renewal.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{renewal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(renewalDate, "dd MMM yyyy")} ·{" "}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(Number(renewal.amountInr))}
                    </p>
                  </div>
                  <Badge className={urgencyClass(daysLeft)} variant="outline">
                    {isToday ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </section>
  )
}