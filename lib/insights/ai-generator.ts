import {
  type SubscriptionForInsights,
  getUnusedSubscriptions,
  getDuplicateCategories,
  getRenewalRisks,
} from "./analyzer"

export type AIInsightMessage = {
  type: "success" | "warning" | "danger" | "celebration"
  title: string
  message: string
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generates a single, highly conversational "AI Insight" given the user's raw subscriptions.
 * Prioritizes insights in this order: Immediate highest risk/waste -> general waste -> clean state.
 */
export function generateAiInsight(
  subs: SubscriptionForInsights[],
): AIInsightMessage {
  // Edge case: No data
  if (!subs || subs.length === 0) {
    return {
      type: "success",
      title: "Hey there!",
      message:
        "I'm SPAY INSIGHT — here to help you save money. Once you add some subscriptions or connect your Gmail, I'll analyze everything and let you know if you're wasting cash anywhere.",
    }
  }

  const unused = getUnusedSubscriptions(subs)
  const duplicates = getDuplicateCategories(subs)
  const risks = getRenewalRisks(subs)

  // 1. High Priority: Danger (Renewals happening in days that are unused)
  if (risks.length > 0) {
    // Take the most urgent or most expensive risk
    const imminent = risks.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)[0]
    const useStatus =
      imminent.daysSinceUse !== null
        ? `hasn't been logged into for ${imminent.daysSinceUse} days`
        : "nobody has used recently"

    return {
      type: "danger",
      title: "Critical Renewal Warning",
      message: `Heads up! Your **${imminent.name}** subscription renews in just **${imminent.daysUntilRenewal} ${imminent.daysUntilRenewal === 1 ? "day" : "days"}** for ${formatInr(imminent.monthlyInr)}, but our scan shows that it ${useStatus}. Might be a completely wasted charge! Jump into your settings to cancel it today if you don't need it anymore.`,
    }
  }

  // 2. Medium Priority: Wasted money on duplicate tools
  if (duplicates.length > 0) {
    // Pick highest value category
    const topCat = duplicates[0]
    // Get the cheapest and most expensive tool
    const sorted = [...topCat.subscriptions].sort((a, b) => a.monthlyInr - b.monthlyInr)
    const cheapest = sorted[0].name
    const expensiveList = sorted.filter(s => s.name !== cheapest)
    const extraCost = expensiveList.reduce((acc, curr) => acc + curr.monthlyInr, 0)
    const toolNames = topCat.subscriptions.map((s) => `**${s.name}**`).join(" and ")

    return {
      type: "warning",
      title: "Duplicate Payments Detected",
      message: `Looks like you are overpaying by running both ${toolNames} for your **${topCat.category || "software"}** needs. Since your team uses multiple similar apps, standardizing on just **${cheapest}** could immediately cut your bills by **${formatInr(extraCost)}** every single month. Talk to your team about consolidating them!`,
    }
  }

  // 3. Medium Priority: Completely unused tools 
  if (unused.length > 0) {
    // Sort by most expensive unused tool
    const worst = unused.sort((a, b) => b.monthlyInr - a.monthlyInr)[0]
    const daysStr =
      worst.daysSinceUse !== null
        ? `over ${worst.daysSinceUse} days`
        : "a very, very long time"

    return {
      type: "warning",
      title: "Subscription Gathering Dust",
      message: `We spotted a big leak: **${worst.name}**. Nobody on the team has used it in ${daysStr}, but it's still bleeding **${formatInr(worst.monthlyInr)}** a month from your company card. This is literally free money sitting on the table. Go cancel it right now and treat the team to coffee instead!`,
    }
  }

  // 4. Fallback Priority: All clean, optimization complete
  return {
    type: "celebration",
    title: "Perfectly Optimized",
    message:
      "I've scanned all your active subscriptions and everything looks perfectly dialed in right now! No duplicate categories, no forgotten ghost subscriptions, and no scary immediate renewals coming up. Keep up the great financial hygiene!",
  }
}
