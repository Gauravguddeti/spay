import { redirect } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { LayoutDashboard, Download } from "lucide-react"
import Link from "next/link"

import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { generateConversationalInsights } from "@/lib/insights/ai-generator"
import {
  getDashboardStats,
  getUpcomingRenewals,
  getSubscriptionsByOrg,
} from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

const severityStyles = {
  info: {
    border: "border-primary/40 bg-primary/5",
    dot: "bg-primary",
    headline: "text-foreground",
    detail: "text-foreground/80",
  },
  warning: {
    border: "border-amber-500/40 bg-amber-500/5",
    dot: "bg-amber-500",
    headline: "text-foreground",
    detail: "text-foreground/80",
  },
  danger: {
    border: "border-red-500/40 bg-red-500/5",
    dot: "bg-red-500",
    headline: "text-foreground",
    detail: "text-foreground/80",
  },
  success: {
    border: "border-emerald-500/40 bg-emerald-500/5",
    dot: "bg-emerald-500",
    headline: "text-foreground",
    detail: "text-foreground/80",
  },
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 3) return "bg-red-500/20 text-red-800 border-red-200"
  if (daysLeft <= 7) return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-emerald-100 text-emerald-800 border-emerald-200"
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID

  let upcomingRenewals: Awaited<ReturnType<typeof getUpcomingRenewals>> = []
  let allSubs: Awaited<ReturnType<typeof getSubscriptionsByOrg>> = []
  let orgName = "My Workspace"
  let showOnboarding = false

  if (!isTempLocalUser) {
    try {
      const organization = await getOrganizationByOwnerId(session.user.id)
      if (!organization) redirect("/login")

      orgName = organization.name
      ;[upcomingRenewals, allSubs] = await Promise.all([
        getUpcomingRenewals(organization.id),
        getSubscriptionsByOrg(organization.id),
      ])

      showOnboarding = !organization.onboardingCompleted && allSubs.length === 0
    } catch {
      upcomingRenewals = []
    }
  }

  const next3Renewals = upcomingRenewals.slice(0, 3)
  const today = new Date()
  const isEmpty = allSubs.filter((s) => s.status === "active").length === 0

  const insights = generateConversationalInsights(
    allSubs.map((s) => ({
      ...s,
      nextRenewalDate: s.nextRenewalDate,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      category: s.category,
    })),
  )

  return (
    <>
      {showOnboarding && <OnboardingWizard orgName={orgName} />}

      <section className="space-y-4">
        <div className="flex items-start justify-between rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
          <div>
            <p className="text-xs font-mono text-muted-foreground">SPEND OVERVIEW</p>
            <h1 className="mt-2 font-serif text-3xl">Dashboard</h1>
          </div>
          {!isEmpty && (
            <a
              href="/api/export/csv"
              className="flex items-center gap-2 rounded-none border border-border/70 bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )}
        </div>

        {/* Conversational AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
              SPAY INSIGHT
            </p>
            {insights.map((insight) => {
              const s = severityStyles[insight.severity]
              return (
                <div
                  key={insight.id}
                  className={`flex items-start gap-4 rounded-none border px-5 py-4 ${s.border}`}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-none ${s.dot}`} />
                  <div>
                    <p className={`font-semibold text-sm ${s.headline}`}>{insight.headline}</p>
                    <p className={`mt-0.5 text-sm ${s.detail}`}>{insight.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <Card className="rounded-none border-border/70">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-none bg-secondary">
                <LayoutDashboard className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-serif text-xl font-medium">Welcome to SPAY</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You have no subscriptions tracked yet. Get started:
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-none">
                  <Link href="/dashboard/subscriptions">+ Add Manually</Link>
                </Button>
                <Button asChild className="rounded-none" variant="outline">
                  <Link href="/dashboard/import">📄 Upload Bank Statement</Link>
                </Button>
                <Button asChild className="rounded-none" variant="outline">
                  <Link href="/dashboard/connect">📧 Scan Gmail</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Renewals */}
        {next3Renewals.length > 0 && (
          <Card className="rounded-none border-border/70">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-mono uppercase tracking-wide">
                UPCOMING RENEWALS
              </CardDescription>
              <p className="font-serif text-xl">Next 3 Renewals</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {next3Renewals.map((renewal) => {
                if (!renewal.nextRenewalDate) return null
                const renewalDate = new Date(renewal.nextRenewalDate)
                const daysLeft = differenceInCalendarDays(renewalDate, today)
                const isToday = daysLeft === 0

                return (
                  <div
                    className="flex items-center justify-between rounded-none border border-border/70 px-4 py-3"
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
    </>
  )
}