"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Copy,
  TrendingUp,
  X,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
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

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-none border border-border/70 bg-card px-3 py-2 shadow-md text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatInr(payload[0].value)}</p>
    </div>
  )
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

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">INSIGHTS</p>
        <h1 className="mt-2 font-serif text-3xl">Spend Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Smart recommendations to reduce SaaS waste
        </p>
      </div>

      {/* Potential savings banner */}
      {potentialSavings > 0 && (
        <div className="rounded-none border border-primary/30 bg-primary/5 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-xs font-mono text-primary/70 uppercase tracking-wide">
                POTENTIAL MONTHLY SAVINGS
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-primary">
                {formatInr(potentialSavings)} / month
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                From unused and duplicate subscriptions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {subscriptions.length === 0 && (
        <Card className="rounded-none border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
            <p className="font-medium">Add more subscriptions to unlock insights</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Insights will surface once you have at least a few subscriptions tracked.
            </p>
            <Button asChild className="mt-4 rounded-none" variant="outline">
              <a href="/dashboard/subscriptions">Add Subscriptions</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All insights dismissed */}
      {subscriptions.length > 0 && noInsights && (
        <Card className="rounded-none border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
            <p className="font-medium">Looking great! No issues found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No unused tools, duplicates, or at-risk renewals detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Section 1 — Unused Subscriptions */}
      {unused.length > 0 && (
        <Card className="rounded-none border-border/70">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-xs font-mono uppercase tracking-wide">
                  SECTION 1
                </CardDescription>
                <CardTitle className="font-serif text-xl">Unused Subscriptions</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  Active tools with no usage recorded in 45+ days
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {unused.map((sub) => (
              <div
                className="flex items-center justify-between gap-4 rounded-none border border-border/70 px-4 py-3"
                key={sub.id}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.daysSinceUse !== null
                      ? `Last used ${sub.daysSinceUse} days ago`
                      : "Never used"}{" "}
                    · {formatInr(sub.monthlyInr)}/mo
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    className="rounded-none text-xs h-8"
                    disabled={cancellingId === sub.id}
                    onClick={() => void handleCancel(sub.id)}
                    size="sm"
                    variant="destructive"
                  >
                    {cancellingId === sub.id
                      ? "Cancelling…"
                      : `Cancel & Save ${formatInr(sub.monthlyInr)}/mo`}
                  </Button>
                  <button
                    className="rounded-none p-1 text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => dismiss(`unused-${sub.id}`)}
                    title="Dismiss"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 2 — Duplicate Tools */}
      {duplicates.length > 0 && (
        <Card className="rounded-none border-border/70">
          <CardHeader>
            <CardDescription className="text-xs font-mono uppercase tracking-wide">
              SECTION 2
            </CardDescription>
            <CardTitle className="font-serif text-xl">Duplicate Tools</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Categories where you&apos;re paying for multiple tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicates.map((dup) => (
              <div
                className="rounded-none border border-amber-500/30 bg-amber-500/10 p-4"
                key={dup.category}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">{dup.category}</span>
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs rounded-none" variant="outline">
                      {dup.subscriptions.length} tools
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatInr(dup.combinedMonthlyInr)}/mo combined
                    </span>
                    <button
                      className="rounded-none p-1 text-muted-foreground hover:bg-muted transition-colors"
                      onClick={() => dismiss(`dup-${dup.category}`)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  You&apos;re paying for both{" "}
                  {dup.subscriptions.map((s) => s.name).join(" and ")} under{" "}
                  {dup.category} — {formatInr(dup.combinedMonthlyInr)}/mo combined.
                </p>
                <div className="flex flex-wrap gap-2">
                  {dup.subscriptions.map((s) => (
                    <Badge key={s.id} variant="outline" className="text-xs rounded-none">
                      {s.name} · {formatInr(s.monthlyInr)}/mo
                    </Badge>
                  ))}
                </div>
                <Button asChild className="mt-3 rounded-none" size="sm" variant="outline">
                  <a href="/dashboard/subscriptions">Review Duplicates</a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 3 — Monthly Spend Trend */}
      {subscriptions.length > 0 && (
        <Card className="rounded-none border-border/70">
          <CardHeader>
            <CardDescription className="text-xs font-mono uppercase tracking-wide">
              SECTION 3
            </CardDescription>
            <CardTitle className="font-serif text-xl">Monthly Spend Trend</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Total subscription spend over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={220} width="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  dataKey="amountInr"
                  dot={{ fill: "var(--primary)", r: 4 }}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Renewal Risk */}
      {risks.length > 0 && (
        <Card className="rounded-none border-border/70">
          <CardHeader>
            <CardDescription className="text-xs font-mono uppercase tracking-wide">
              SECTION 4
            </CardDescription>
            <CardTitle className="font-serif text-xl">Renewal Risk</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Renewing within 7 days but showing low usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk) => (
              <div
                className="flex items-center justify-between gap-4 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3"
                key={risk.id}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">{risk.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Renews in {risk.daysUntilRenewal} day
                      {risk.daysUntilRenewal !== 1 ? "s" : ""} ·{" "}
                      {risk.daysSinceUse !== null
                        ? `last used ${risk.daysSinceUse} days ago`
                        : "never used"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-red-500">
                    {formatInr(risk.monthlyInr)}/mo
                  </span>
                  <button
                    className="rounded-none p-1 text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => dismiss(`risk-${risk.id}`)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
