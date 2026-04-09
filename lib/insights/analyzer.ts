/**
 * SPAY Insights Analyzer — Phase 6
 *
 * Pure, deterministic functions over a pre-fetched subscription array.
 * No DB calls — pass the full org subscriptions from the page.
 */

export type SubscriptionForInsights = {
  id: string
  name: string
  category: string | null
  amountInr: string
  billingCycle: "monthly" | "annual" | "one-time" | string
  status: "active" | "cancelled" | "paused" | string
  nextRenewalDate: Date | string | null
  lastUsedAt: Date | string | null
  createdAt: Date | string
}

// ---------------------------------------------------------------------------
// Monthly cost normaliser
// ---------------------------------------------------------------------------
function monthlyInr(sub: SubscriptionForInsights): number {
  const amount = Number(sub.amountInr)
  if (sub.billingCycle === "annual") return Math.round((amount / 12) * 100) / 100
  if (sub.billingCycle === "monthly") return amount
  return 0 // one-time: not a recurring cost
}

// ---------------------------------------------------------------------------
// 1. Unused subscriptions
//    Active subscriptions where lastUsedAt is null OR older than 45 days
// ---------------------------------------------------------------------------
export type UnusedSubscription = SubscriptionForInsights & {
  monthlyInr: number
  daysSinceUse: number | null
}

export function getUnusedSubscriptions(
  subs: SubscriptionForInsights[],
): UnusedSubscription[] {
  const now = new Date()
  const THRESHOLD_DAYS = 45

  return subs
    .filter((s) => s.status === "active")
    .map((s) => {
      const lastUsed = s.lastUsedAt ? new Date(s.lastUsedAt) : null
      const daysSinceUse = lastUsed
        ? Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const isUnused = daysSinceUse === null || daysSinceUse > THRESHOLD_DAYS
      if (!isUnused) return null

      return { ...s, monthlyInr: monthlyInr(s), daysSinceUse }
    })
    .filter(Boolean) as UnusedSubscription[]
}

// ---------------------------------------------------------------------------
// 2. Duplicate tools
//    Categories that have 2+ active subscriptions
// ---------------------------------------------------------------------------
export type DuplicateCategory = {
  category: string
  subscriptions: (SubscriptionForInsights & { monthlyInr: number })[]
  combinedMonthlyInr: number
}

export function getDuplicateCategories(
  subs: SubscriptionForInsights[],
): DuplicateCategory[] {
  const active = subs.filter((s) => s.status === "active")

  const byCategory: Record<string, SubscriptionForInsights[]> = {}
  for (const sub of active) {
    const cat = sub.category ?? "Other"
    byCategory[cat] = [...(byCategory[cat] ?? []), sub]
  }

  return Object.entries(byCategory)
    .filter(([, items]) => items.length >= 2)
    .map(([category, items]) => {
      const enriched = items.map((s) => ({ ...s, monthlyInr: monthlyInr(s) }))
      return {
        category,
        subscriptions: enriched,
        combinedMonthlyInr: enriched.reduce((acc, s) => acc + s.monthlyInr, 0),
      }
    })
    .sort((a, b) => b.combinedMonthlyInr - a.combinedMonthlyInr)
}

// ---------------------------------------------------------------------------
// 3. Monthly spend trend — last 6 months
// ---------------------------------------------------------------------------
export type MonthlySpendPoint = {
  month: string  // "Jan 25"
  amountInr: number
}

export function getMonthlySpendTrend(
  subs: SubscriptionForInsights[],
): MonthlySpendPoint[] {
  const now = new Date()
  const points: MonthlySpendPoint[] = []

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    // Count active subs that existed at this month (createdAt <= monthEnd, not cancelled before month)
    let total = 0
    for (const sub of subs) {
      if (sub.status !== "active" && sub.status !== "paused") continue
      const created = new Date(sub.createdAt)
      if (created > monthEnd) continue
      total += monthlyInr(sub)
    }

    points.push({
      month: month.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      amountInr: Math.round(total),
    })
  }

  return points
}

// ---------------------------------------------------------------------------
// 4. Renewal risks
//    Active subs renewing <7 days AND lastUsedAt is null or >30 days
// ---------------------------------------------------------------------------
export type RenewalRisk = SubscriptionForInsights & {
  daysUntilRenewal: number
  daysSinceUse: number | null
  monthlyInr: number
}

export function getRenewalRisks(subs: SubscriptionForInsights[]): RenewalRisk[] {
  const now = new Date()

  return subs
    .filter((s) => s.status === "active" && s.nextRenewalDate)
    .map((s) => {
      const renewal = new Date(s.nextRenewalDate!)
      const daysUntilRenewal = Math.ceil(
        (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysUntilRenewal > 7 || daysUntilRenewal < 0) return null

      const lastUsed = s.lastUsedAt ? new Date(s.lastUsedAt) : null
      const daysSinceUse = lastUsed
        ? Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const isRisky = daysSinceUse === null || daysSinceUse > 30
      if (!isRisky) return null

      return { ...s, daysUntilRenewal, daysSinceUse, monthlyInr: monthlyInr(s) }
    })
    .filter(Boolean) as RenewalRisk[]
}

// ---------------------------------------------------------------------------
// Total potential savings = unused + duplicates (non-overlapping)
// ---------------------------------------------------------------------------
export function getPotentialMonthlySavings(
  unused: UnusedSubscription[],
  duplicates: DuplicateCategory[],
): number {
  // Savings from unused subs
  const unusedSavings = unused.reduce((acc, s) => acc + s.monthlyInr, 0)

  // Savings from duplicate categories: save the cheapest tool in each group
  const duplicateSavings = duplicates.reduce((acc, cat) => {
    const sorted = [...cat.subscriptions].sort((a, b) => a.monthlyInr - b.monthlyInr)
    // Can save cost of all except the most expensive
    const saveable = sorted.slice(0, sorted.length - 1).reduce(
      (s, sub) => s + sub.monthlyInr,
      0,
    )
    return acc + saveable
  }, 0)

  return Math.round(unusedSavings + duplicateSavings)
}
