"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Copy,
  TrendingUp,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type DuplicateCategory,
  type MonthlySpendPoint,
  type RenewalRisk,
  type UnusedSubscription,
  getDuplicateCategories,
  getMonthlySpendTrend,
  getPotentialMonthlySavings,
  getRenewalRisks,
  getUnusedSubscriptions,
} from "@/lib/insights/analyzer"

const MonthlySpendTrendChart = dynamic(
  () => import("@/components/dashboard/charts/MonthlySpendTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full animate-pulse rounded-none bg-muted motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300" />
    ),
  },
)

const DISMISS_KEY = "spay_dismissed_insights"

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return raw ? (new Set(JSON.parse(raw) as string[])) : new Set()
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

type RawSub = {
  id: string
  name: string
  category: string | null
  amountInr: string
  billingCycle: string
  status: string
  nextRenewalDate?: string | null
  lastUsedAt?: string | null
  createdAt?: string
}

export function InsightsPageClient({ subscriptions }: { subscriptions: RawSub[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    saveDismissed(next)
  }

  // Run analyzers
  const subs = subscriptions as Parameters<typeof getUnusedSubscriptions>[0]
  const unused: UnusedSubscription[] = getUnusedSubscriptions(subs).filter(
    (s) => !dismissed.has(`unused-${s.id}`),
  )
  const duplicates: DuplicateCategory[] = getDuplicateCategories(subs).filter(
    (d) => !dismissed.has(`dup-${d.category}`),
  )
  const trend: MonthlySpendPoint[] = getMonthlySpendTrend(subs)
  const risks: RenewalRisk[] = getRenewalRisks(subs).filter(
    (r) => !dismissed.has(`risk-${r.id}`),
  )
  const potentialSavings = getPotentialMonthlySavings(
    getUnusedSubscriptions(subs),
    getDuplicateCategories(subs),
  )

  async function handleCancel(subscriptionId: string) {
    setCancellingId(subscriptionId)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (res.ok) {
        toast.success("Subscription cancelled")
        dismiss(`unused-${subscriptionId}`)
        router.refresh()
      } else {
        toast.error("Failed to cancel")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setCancellingId(null)
    }
  }

  const noInsights =
    unused.length === 0 && duplicates.length === 0 && risks.length === 0
  const openSignals = unused.length + duplicates.length + risks.length

  return (
    <section className="space-y-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      <div className="rounded-none border bg-[var(--surface-raised)] px-6 py-5 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
        <div className="accent-line" />
        <h1 className="font-serif text-2xl font-bold tracking-tight text-white">Insights</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Spending patterns and savings opportunities</p>
      </div>

      {subscriptions.length === 0 && (
        <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="mb-3 h-10 w-10 text-[var(--text-faint)]" />
            <p className="font-medium text-[var(--text-primary)]">Add more subscriptions to unlock insights</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Insights will surface once you have at least a few subscriptions tracked.
            </p>
            <Button asChild className="mt-4 rounded-none" variant="outline">
              <Link href="/dashboard/subscriptions">Add Subscriptions</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {subscriptions.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-mono uppercase tracking-widest">Potential Savings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold text-[var(--text-accent)]">{formatInr(potentialSavings)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Estimated monthly optimization</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-mono uppercase tracking-widest">Open Signals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{openSignals}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Unused, duplicate, and at-risk renewals</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-mono uppercase tracking-widest">Tracked Subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{subscriptions.length}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Analyzed for savings and renewal risk</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-none border border-t-2 [border-color:var(--border-subtle)] [border-top-color:var(--accent-primary)] [background:var(--surface-raised)]">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[var(--text-primary)]">Monthly Spend Trend</CardTitle>
              <CardDescription className="text-sm text-[var(--text-muted)]">Total subscription spend over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-none border p-3 [background:var(--surface-sunken)] [border-color:var(--border-subtle)]">
                <MonthlySpendTrendChart data={trend} />
              </div>
            </CardContent>
          </Card>

          {noInsights ? (
            <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="mb-3 h-10 w-10 text-[var(--status-success)]" />
                <p className="font-medium text-[var(--text-primary)]">Looking great! No issues found</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  No unused tools, duplicates, or at-risk renewals detected.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)]">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-[var(--text-primary)]">Renewal Risk Radar</CardTitle>
                  <CardDescription className="text-sm text-[var(--text-muted)]">Upcoming renewals weighted by urgency</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {risks.length === 0 ? (
                    <div className="rounded-none border border-l-[3px] px-4 py-3 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] [border-left-color:var(--status-success)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">No immediate renewal risk</p>
                      <p className="text-xs text-[var(--text-muted)]">No subscriptions are renewing soon with low usage.</p>
                    </div>
                  ) : (
                    risks.map((risk) => {
                      const urgencyBorder =
                        risk.daysUntilRenewal <= 3
                          ? "[border-left-color:var(--status-danger)]"
                          : risk.daysUntilRenewal <= 7
                            ? "[border-left-color:var(--status-warning)]"
                            : "[border-left-color:var(--status-success)]"

                      const urgencyText =
                        risk.daysUntilRenewal <= 3
                          ? "text-[var(--status-danger)]"
                          : risk.daysUntilRenewal <= 7
                            ? "text-[var(--status-warning)]"
                            : "text-[var(--status-success)]"

                      return (
                        <div
                          className={`flex items-center justify-between gap-4 rounded-none border border-l-[3px] px-4 py-3 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] ${urgencyBorder}`}
                          key={risk.id}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${urgencyText}`} />
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{risk.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                Renews in {risk.daysUntilRenewal} day
                                {risk.daysUntilRenewal !== 1 ? "s" : ""} ·{" "}
                                {risk.daysSinceUse !== null
                                  ? `last used ${risk.daysSinceUse} days ago`
                                  : "never used"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`font-display text-sm font-bold ${urgencyText}`}>
                              {formatInr(risk.monthlyInr)}/mo
                            </span>
                            <button
                              className="rounded-none p-1 text-[var(--text-muted)] transition-colors hover:[background:var(--surface-sunken)] hover:text-[var(--text-primary)]"
                              onClick={() => dismiss(`risk-${risk.id}`)}
                              type="button"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-none border [border-color:var(--border-subtle)] [background:var(--surface-raised)]">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-[var(--text-primary)]">Savings Opportunities</CardTitle>
                  <CardDescription className="text-sm text-[var(--text-muted)]">Unused and duplicate tools worth optimizing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unused.map((sub) => (
                    <div
                      className="rounded-none border border-l-[3px] px-4 py-3 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] [border-left-color:var(--status-success)]"
                      key={sub.id}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{sub.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {sub.daysSinceUse !== null
                              ? `Last used ${sub.daysSinceUse} days ago`
                              : "Never used"} · {formatInr(sub.monthlyInr)}/mo
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            className="h-8 rounded-none border border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-xs text-[var(--status-success)] hover:bg-[var(--status-success-bg)]"
                            disabled={cancellingId === sub.id}
                            onClick={() => void handleCancel(sub.id)}
                            size="sm"
                            variant="ghost"
                          >
                            {cancellingId === sub.id ? "Cancelling…" : `Save ${formatInr(sub.monthlyInr)}/mo`}
                          </Button>
                          <button
                            className="rounded-none p-1 text-[var(--text-muted)] transition-colors hover:[background:var(--surface-sunken)] hover:text-[var(--text-primary)]"
                            onClick={() => dismiss(`unused-${sub.id}`)}
                            title="Dismiss"
                            type="button"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {duplicates.map((dup) => (
                    <div
                      className="rounded-none border border-l-[3px] p-4 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] [border-left-color:var(--status-warning)]"
                      key={dup.category}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Copy className="h-4 w-4 text-[var(--status-warning)]" />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{dup.category}</span>
                          <Badge className="rounded-none border [background:var(--status-warning-bg)] [border-color:var(--status-warning-border)] text-[var(--status-warning)]" variant="outline">
                            {dup.subscriptions.length} tools
                          </Badge>
                        </div>
                        <button
                          className="rounded-none p-1 text-[var(--text-muted)] transition-colors hover:[background:var(--surface-sunken)] hover:text-[var(--text-primary)]"
                          onClick={() => dismiss(`dup-${dup.category}`)}
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mb-3 text-xs text-[var(--text-muted)]">
                        You&apos;re paying for both {dup.subscriptions.map((s) => s.name).join(" and ")} under {dup.category} — {formatInr(dup.combinedMonthlyInr)}/mo combined.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {dup.subscriptions.map((s) => (
                          <Badge key={s.id} variant="outline" className="rounded-none border [border-color:var(--border-default)] [background:var(--surface-sunken)] text-xs text-[var(--text-secondary)]">
                            {s.name} · {formatInr(s.monthlyInr)}/mo
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}

                  {unused.length === 0 && duplicates.length === 0 && (
                    <div className="rounded-none border border-l-[3px] px-4 py-3 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] [border-left-color:var(--status-success)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">No immediate savings opportunities</p>
                      <p className="text-xs text-[var(--text-muted)]">Usage and category mix look healthy right now.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  )
}
