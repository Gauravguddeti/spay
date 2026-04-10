import { differenceInDays } from "date-fns"

export type InsightSeverity = "info" | "warning" | "danger" | "success"

export interface ConversationalInsight {
  id: string
  severity: InsightSeverity
  headline: string
  detail: string
}

type SubscriptionForInsights = {
  id: string
  name: string
  amountInr: string
  billingCycle: string
  status: string
  lastUsedAt: Date | string | null
  nextRenewalDate: Date | string | null
  category: string | null
  createdAt: Date | string
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

function toDate(d: Date | string | null): Date | null {
  if (!d) return null
  return d instanceof Date ? d : new Date(d)
}

export function generateConversationalInsights(
  subscriptions: SubscriptionForInsights[],
): ConversationalInsight[] {
  const active = subscriptions.filter((s) => s.status === "active")
  if (active.length === 0) return []

  const insights: ConversationalInsight[] = []
  const today = new Date()

  // 1. Total monthly spend
  const totalMonthly = active.reduce((acc, s) => {
    const amount = Number(s.amountInr)
    return acc + (s.billingCycle === "annual" ? amount / 12 : amount)
  }, 0)
  insights.push({
    id: "total-spend",
    severity: totalMonthly > 20000 ? "warning" : "info",
    headline: `You're spending ${formatInr(totalMonthly)}/month on SaaS`,
    detail:
      totalMonthly > 20000
        ? `That's a significant SaaS budget. Check if every tool is earning its keep.`
        : `Across ${active.length} active ${active.length === 1 ? "tool" : "tools"}. That's your full monthly bill.`,
  })

  // 2. Unused tools
  const unused = active.filter((s) => {
    const last = toDate(s.lastUsedAt)
    return last && differenceInDays(today, last) >= 45
  })
  if (unused.length > 0) {
    const unusedCost = unused.reduce((acc, s) => acc + Number(s.amountInr), 0)
    insights.push({
      id: "unused-tools",
      severity: "danger",
      headline: `${formatInr(unusedCost)} looks wasteful — ${unused.length} ${unused.length === 1 ? "tool" : "tools"} unused for 45+ days`,
      detail: `${unused.map((s) => s.name).join(", ")} ${unused.length === 1 ? "hasn't" : "haven't"} been used recently. Consider cancelling or pausing ${unused.length === 1 ? "it" : "them"}.`,
    })
  }

  // 3. Renewals this week
  const renewingSoon = active.filter((s) => {
    const d = toDate(s.nextRenewalDate)
    if (!d) return false
    const diff = differenceInDays(d, today)
    return diff >= 0 && diff <= 7
  })
  if (renewingSoon.length > 0) {
    insights.push({
      id: "renewals-soon",
      severity: renewingSoon.length >= 3 ? "warning" : "info",
      headline: `${renewingSoon.length} ${renewingSoon.length === 1 ? "tool is" : "tools are"} renewing this week`,
      detail: `${renewingSoon.map((s) => s.name).join(", ")} will auto-charge soon. Heads up!`,
    })
  }

  // 4. Duplicate categories
  const categoryMap = new Map<string, string[]>()
  for (const s of active) {
    if (!s.category) continue
    const existing = categoryMap.get(s.category) ?? []
    categoryMap.set(s.category, [...existing, s.name])
  }
  for (const [category, names] of categoryMap.entries()) {
    if (names.length >= 2) {
      insights.push({
        id: `dup-${category}`,
        severity: "warning",
        headline: `You have ${names.length} ${category} tools — that might be overlap`,
        detail: `${names.join(" and ")} are both in the same category. Could you consolidate to just one?`,
      })
      break // Only show first duplicate group
    }
  }

  // 5. All clear
  if (insights.length === 1) {
    // Only total spend insight
    insights.push({
      id: "all-clear",
      severity: "success",
      headline: "Your stack looks lean and healthy!",
      detail: "No unused tools, no upcoming surprises. Keep it up.",
    })
  }

  return insights
}

// ─── Legacy single-insight API (still used by AIInsightCard) ─────────────────
export type AIInsightMessage = {
  type: "danger" | "warning" | "success" | "celebration"
  title: string
  message: string
}

export function generateAiInsight(subscriptions: SubscriptionForInsights[]): AIInsightMessage {
  const insights = generateConversationalInsights(subscriptions)
  if (insights.length === 0) {
    return {
      type: "success",
      title: "Hey there!",
      message:
        "I'm SPAY INSIGHT — here to help you save money. Once you add some subscriptions or connect your Gmail, I'll analyze everything and let you know if you're wasting cash anywhere.",
    }
  }

  const top = insights[0]
  return {
    type: top.severity === "danger" ? "danger" : top.severity === "warning" ? "warning" : "celebration",
    title: top.headline,
    message: top.detail,
  }
}
