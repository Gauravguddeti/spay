import { redirect } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { LayoutDashboard, Download, ChevronRight } from "lucide-react"
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
import { DEV_TEST_USER_ID } from "@/lib/utils/constants"

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

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

function formatInr(value: number): string {
  return inrFormatter.format(Math.max(0, value))
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 3) return "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
  if (daysLeft <= 7) return "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
  return "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
}

function renewalRowClass(daysLeft: number): string {
  if (daysLeft <= 3) return "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]"
  if (daysLeft <= 7) return "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]"
  return "border-[var(--border-subtle)] bg-[var(--surface-overlay)]"
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  // DEV ONLY - this block is unreachable in production
  // Remove before public launch if no longer needed
  const isTempLocalUser =
    process.env.NODE_ENV === "development" &&
    DEV_TEST_USER_ID !== null &&
    session.user.id === DEV_TEST_USER_ID

  let upcomingRenewals: Awaited<ReturnType<typeof getUpcomingRenewals>> = []
  let allSubs: Awaited<ReturnType<typeof getSubscriptionsByOrg>> = []
  let stats: Awaited<ReturnType<typeof getDashboardStats>> = {
    totalMonthlySpendInr: 0,
    activeSubscriptionsCount: 0,
    renewingThisMonthCount: 0,
    potentialSavingsCount: 0,
    potentialSavingsInr: 0,
  }
  let orgName = "My Workspace"
  let showOnboarding = false

  if (!isTempLocalUser) {
    try {
      const organization = await getOrganizationByOwnerId(session.user.id)
      if (!organization) redirect("/login")

      orgName = organization.name
      ;[upcomingRenewals, allSubs, stats] = await Promise.all([
        getUpcomingRenewals(organization.id),
        getSubscriptionsByOrg(organization.id),
        getDashboardStats(organization.id),
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

      <section className="relative space-y-4 overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
        <div className="brand-glow -right-52 -top-56 opacity-80" aria-hidden="true" />

        <div className="relative z-10 flex items-start justify-between rounded-none border bg-[var(--surface-raised)] px-6 py-5 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
          <div>
            <div className="accent-line" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Your spend overview</p>
          </div>
          {!isEmpty && (
            <a
              href="/api/export/csv"
              className="flex items-center gap-2 rounded-none border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-overlay)] [background:var(--surface-base)] [border-color:var(--border-subtle)]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-none border-l-2 border border-[var(--border-subtle)] [border-left-color:var(--accent-primary)] [background:var(--surface-raised)] transition-all duration-300 ease-out hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest">
                Monthly Spend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{formatInr(stats.totalMonthlySpendInr)}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Estimated normalized monthly burn</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-l-2 border border-[var(--border-subtle)] [border-left-color:var(--accent-primary)] [background:var(--surface-raised)] transition-all duration-300 ease-out hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest">
                Active Subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{stats.activeSubscriptionsCount}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Currently billing tools</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-l-2 border border-[var(--border-subtle)] [border-left-color:var(--status-warning)] [background:var(--surface-raised)] transition-all duration-300 ease-out hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest">
                Renewing Soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{stats.renewingThisMonthCount}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Due in the next 30 days</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-l-2 border border-[var(--border-subtle)] [border-left-color:var(--status-success)] [background:var(--surface-raised)] transition-all duration-300 ease-out hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest">
                Potential Savings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{formatInr(stats.potentialSavingsInr)}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {stats.potentialSavingsCount} underused subscription{stats.potentialSavingsCount === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conversational AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
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
          <Card className="rounded-none border-border/70 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
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
          <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-mono uppercase tracking-wide">
                UPCOMING RENEWALS
              </CardDescription>
              <p className="font-display text-xl text-[var(--text-primary)]">Next 3 Renewals</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {next3Renewals.map((renewal) => {
                if (!renewal.nextRenewalDate) return null
                const renewalDate = new Date(renewal.nextRenewalDate)
                const daysLeft = differenceInCalendarDays(renewalDate, today)
                const isToday = daysLeft === 0

                return (
                  <div
                    className={`flex items-center justify-between rounded-none border px-4 py-3 ${renewalRowClass(daysLeft)}`}
                    key={renewal.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{renewal.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(renewalDate, "dd MMM yyyy")} ·{" "}
                        {formatInr(Number(renewal.amountInr))}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <Badge className={urgencyClass(daysLeft)} variant="outline">
                        {isToday ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-[var(--text-faint)]" />
                    </div>
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