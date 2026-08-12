/**
 * Reconciliation Matcher — lib/reconciliation/matcher.ts
 *
 * For each bank_transaction, normalises the vendor name and fuzzy-matches it
 * against all subscriptions for the same org. Writes results to
 * reconciliation_matches with a populated match_reason for every row.
 *
 * Score tiers:
 *   >= 0.90 similarity  AND  amount within 2%  → matched
 *   0.60 – 0.89                                → needs_review
 *   < 0.60 or no amount match                  → unmatched
 *
 * Extra flags (also written into match_reason):
 *   • ghost subscription — cancelled sub still receiving matching charges
 *   • duplicate charge  — same vendor+amount within 30 days
 */

import { distance } from "fastest-levenshtein"
import { db } from "@/lib/db"
import {
  bankTransactions,
  reconciliationMatches,
  subscriptions,
} from "@/lib/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Vendor name normalisation
// ---------------------------------------------------------------------------

/** Common noise suffixes to strip before comparison */
const NOISE_PATTERN =
  /\b(inc|ltd|llc|pvt|pte|co|corp|group|technologies|technology|services|service|billing|payments?|systems?|solutions?|global|international|digital|online|cloud|software|apps?|labs?|video|media|networks?|communications?|enterprises?|ventures?|studio|studios|platform|platforms)\b/gi

export function normalizeVendorName(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(NOISE_PATTERN, "")          // strip corporate noise
    .replace(/[^a-z0-9\s]/g, " ")       // remove special chars
    .replace(/\s+/g, " ")               // collapse whitespace
    .trim()

  // If multiple words remain, take only the first meaningful token
  // e.g. "ZOOM VIDEO" → "ZOOM", "GITHUB ACTIONS" → "GITHUB"
  // This avoids penalising a longer raw name against a short stored name
  const tokens = normalized.split(" ").filter(Boolean)
  const result = tokens.length > 1 ? tokens[0] : normalized

  return result.toUpperCase()
}

// ---------------------------------------------------------------------------
// Fuzzy similarity (0–1)
// ---------------------------------------------------------------------------

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - distance(a, b) / maxLen
}

// ---------------------------------------------------------------------------
// Amount tolerance check (within 2%)
// ---------------------------------------------------------------------------

function withinTolerance(txAmount: number, subAmount: number, pct = 0.02): boolean {
  if (subAmount === 0) return txAmount === 0
  return Math.abs(txAmount - subAmount) / subAmount <= pct
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type MatchStatus = "matched" | "needs_review" | "unmatched"

export type MatchResult = {
  bankTransactionId: string
  subscriptionId: string | null
  status: MatchStatus
  confidenceScore: number
  matchReason: string
}

// ---------------------------------------------------------------------------
// runMatcher — called by POST /api/reconciliation/run
// ---------------------------------------------------------------------------

export async function runMatcherForOrg(orgId: string): Promise<{
  matched: number
  needsReview: number
  unmatched: number
  ghostSubscriptions: number
  duplicateCharges: number
  total: number
}> {
  // 1. Fetch all unprocessed bank transactions for this org (no existing match yet)
  const txList = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.orgId, orgId),
        // Only unprocessed rows (no match written yet)
        sql`${bankTransactions.id} not in (
          select bank_transaction_id from reconciliation_matches
        )`,
      ),
    )

  if (txList.length === 0) return { matched: 0, needsReview: 0, unmatched: 0, ghostSubscriptions: 0, duplicateCharges: 0, total: 0 }

  // 2. Fetch all subscriptions for this org
  const orgSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))

  // 3. Build a de-dup window: vendor+amount → dates seen
  const dupWindow = new Map<string, Date[]>()
  for (const tx of txList) {
    const key = `${tx.vendorNormalized}::${tx.amount}`
    if (!dupWindow.has(key)) dupWindow.set(key, [])
    if (tx.date) dupWindow.get(key)!.push(new Date(tx.date))
  }

  // 4. Match each transaction
  const results: MatchResult[] = []
  const stats = { matched: 0, needsReview: 0, unmatched: 0, ghostSubscriptions: 0, duplicateCharges: 0 }

  for (const tx of txList) {
    const txAmount = parseFloat(tx.amount as string)
    const txNorm = tx.vendorNormalized

    // --- duplicate detection ---
    const dupKey = `${txNorm}::${tx.amount}`
    const dates = dupWindow.get(dupKey) ?? []
    const isDuplicate =
      dates.length > 1 &&
      tx.date &&
      dates.some((d) => {
        const diff = Math.abs(new Date(tx.date!).getTime() - d.getTime())
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000 // within 30 days
      })

    // --- find best matching subscription ---
    let bestSub: (typeof orgSubs)[0] | null = null
    let bestScore = 0

    for (const sub of orgSubs) {
      const subNorm = normalizeVendorName(sub.name)
      const score = similarity(txNorm, subNorm)
      if (score > bestScore) {
        bestScore = score
        bestSub = sub
      }
    }

    const amountMatch = bestSub
      ? withinTolerance(txAmount, parseFloat(bestSub.amountInr as string))
      : false

    // --- ghost subscription detection ---
    const isGhost =
      bestSub?.status === "cancelled" &&
      bestScore >= 0.6 &&
      amountMatch

    // --- determine status ---
    let status: MatchStatus
    const reasons: string[] = []

    if (bestScore >= 0.9 && amountMatch) {
      status = "matched"
      reasons.push(`exact vendor match (similarity ${bestScore.toFixed(2)}), amount within 2% tolerance`)
    } else if (bestScore >= 0.6) {
      status = "needs_review"
      reasons.push(`fuzzy vendor match (similarity ${bestScore.toFixed(2)})`)
      if (!amountMatch) reasons.push("amount outside tolerance")
    } else {
      status = "unmatched"
      reasons.push(`no vendor match (best similarity ${bestScore.toFixed(2)})`)
    }

    if (isGhost) {
      reasons.push("ghost subscription detected — subscription is marked cancelled but charge still occurring")
      stats.ghostSubscriptions++
    }
    if (isDuplicate) {
      reasons.push("potential duplicate charge — same vendor+amount within 30 days")
      stats.duplicateCharges++
      // Escalate duplicate matched items to needs_review for human eyes
      if (status === "matched") status = "needs_review"
    }

    stats[status === "matched" ? "matched" : status === "needs_review" ? "needsReview" : "unmatched"]++

    results.push({
      bankTransactionId: tx.id,
      subscriptionId: bestSub && bestScore >= 0.6 ? bestSub.id : null,
      status,
      confidenceScore: bestScore,
      matchReason: reasons.join("; "),
    })
  }

  // 5. Bulk insert results
  await db.insert(reconciliationMatches).values(
    results.map((r) => ({
      bankTransactionId: r.bankTransactionId,
      subscriptionId: r.subscriptionId,
      status: r.status,
      confidenceScore: r.confidenceScore.toFixed(4),
      matchReason: r.matchReason,
    })),
  )

  return { ...stats, total: txList.length }
}
