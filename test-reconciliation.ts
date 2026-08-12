/**
 * test-reconciliation.ts
 *
 * Synthetic reconciliation test. Mocks the DB layer to test the matcher
 * against a realistic set of edge cases:
 *   1. Exact name + amount match          → matched
 *   2. Fuzzy name variant + amount match  → matched or needs_review
 *   3. Name match but amount drift >2%    → needs_review
 *   4. Duplicate charge same vendor/amt   → needs_review (escalated)
 *   5. Ghost subscription (cancelled sub) → needs_review + ghost flag
 *   6. No match at all                    → unmatched
 */

import { normalizeVendorName, similarity } from "./lib/reconciliation/matcher"

// ---------------------------------------------------------------------------
// Inline matcher logic (avoids DB dependency for pure unit testing)
// ---------------------------------------------------------------------------

type MockSubscription = {
  id: string
  name: string
  amountInr: string
  status: "active" | "cancelled" | "paused"
  orgId: string
  billingCycle: string
}

type MockTransaction = {
  id: string
  vendorRaw: string
  vendorNormalized: string
  amount: string
  date: string | null
  source: string
}

function withinTolerance(a: number, b: number, pct = 0.02) {
  if (b === 0) return a === 0
  return Math.abs(a - b) / b <= pct
}

type MatchStatus = "matched" | "needs_review" | "unmatched"

function match(tx: MockTransaction, subs: MockSubscription[], allTxs: MockTransaction[]) {
  const txAmount = parseFloat(tx.amount)
  let bestSub: MockSubscription | null = null
  let bestScore = 0

  for (const sub of subs) {
    const subNorm = normalizeVendorName(sub.name)
    const score = similarity(tx.vendorNormalized, subNorm)
    if (score > bestScore) {
      bestScore = score
      bestSub = sub
    }
  }

  const amountMatch = bestSub ? withinTolerance(txAmount, parseFloat(bestSub.amountInr)) : false
  const isGhost = bestSub?.status === "cancelled" && bestScore >= 0.6 && amountMatch

  // Duplicate detection: same vendor+amount within 30 days
  const dupKey = `${tx.vendorNormalized}::${tx.amount}`
  const sibling = allTxs.find((other) => {
    if (other.id === tx.id) return false
    const otherKey = `${other.vendorNormalized}::${other.amount}`
    if (otherKey !== dupKey) return false
    if (!tx.date || !other.date) return false
    const diff = Math.abs(new Date(tx.date).getTime() - new Date(other.date).getTime())
    return diff < 30 * 24 * 60 * 60 * 1000
  })
  const isDuplicate = Boolean(sibling)

  const reasons: string[] = []
  let status: MatchStatus

  if (bestScore >= 0.9 && amountMatch) {
    status = "matched"
    reasons.push(`exact vendor match (${bestScore.toFixed(2)}), amount within tolerance`)
  } else if (bestScore >= 0.6) {
    status = "needs_review"
    reasons.push(`fuzzy match (${bestScore.toFixed(2)})`)
    if (!amountMatch) reasons.push("amount outside tolerance")
  } else {
    status = "unmatched"
    reasons.push(`no match (best sim ${bestScore.toFixed(2)})`)
  }

  if (isGhost) reasons.push("⚠ GHOST SUBSCRIPTION — cancelled sub still receiving charges")
  if (isDuplicate) {
    reasons.push("⚠ DUPLICATE CHARGE — same vendor+amount within 30 days")
    if (status === "matched") status = "needs_review"
  }

  return { status, bestSub, bestScore, amountMatch, isGhost, isDuplicate, reason: reasons.join("; ") }
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const subs: MockSubscription[] = [
  { id: "sub-1", name: "Notion",    amountInr: "1500.00", status: "active",    orgId: "org-1", billingCycle: "monthly" },
  { id: "sub-2", name: "GitHub",    amountInr: "336.00",  status: "active",    orgId: "org-1", billingCycle: "monthly" },
  { id: "sub-3", name: "Figma",     amountInr: "2100.00", status: "active",    orgId: "org-1", billingCycle: "monthly" },
  { id: "sub-4", name: "Zoom",      amountInr: "1344.00", status: "cancelled", orgId: "org-1", billingCycle: "monthly" }, // Ghost sub
  { id: "sub-5", name: "Vercel",    amountInr: "1680.00", status: "active",    orgId: "org-1", billingCycle: "monthly" },
]

const transactions: MockTransaction[] = [
  // Case 1: Exact match
  {
    id: "tx-1",
    vendorRaw: "Notion",
    vendorNormalized: normalizeVendorName("Notion"),
    amount: "1500.00",
    date: "2026-07-15",
    source: "pdf",
  },
  // Case 2: Fuzzy variant — "GITHUB INC" should match GitHub
  {
    id: "tx-2",
    vendorRaw: "GITHUB INC",
    vendorNormalized: normalizeVendorName("GITHUB INC"),
    amount: "336.00",
    date: "2026-07-15",
    source: "pdf",
  },
  // Case 3: Name matches Figma but amount has 5% drift (outside 2%)
  {
    id: "tx-3",
    vendorRaw: "Figma Inc.",
    vendorNormalized: normalizeVendorName("Figma Inc."),
    amount: "2210.00", // ~5.2% drift from 2100
    date: "2026-07-15",
    source: "pdf",
  },
  // Case 4a: Duplicate charge #1 (Vercel)
  {
    id: "tx-4a",
    vendorRaw: "Vercel",
    vendorNormalized: normalizeVendorName("Vercel"),
    amount: "1680.00",
    date: "2026-07-01",
    source: "pdf",
  },
  // Case 4b: Duplicate charge #2 (Vercel, same month)
  {
    id: "tx-4b",
    vendorRaw: "Vercel",
    vendorNormalized: normalizeVendorName("Vercel"),
    amount: "1680.00",
    date: "2026-07-15",
    source: "pdf",
  },
  // Case 5: Ghost subscription — Zoom is cancelled but still being charged
  {
    id: "tx-5",
    vendorRaw: "Zoom Video Communications",
    vendorNormalized: normalizeVendorName("Zoom Video Communications"),
    amount: "1344.00",
    date: "2026-07-15",
    source: "pdf",
  },
  // Case 6: Completely unknown vendor
  {
    id: "tx-6",
    vendorRaw: "XYZABC SERVICES PVT LTD",
    vendorNormalized: normalizeVendorName("XYZABC SERVICES PVT LTD"),
    amount: "500.00",
    date: "2026-07-15",
    source: "pdf",
  },
]

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("=== Reconciliation Matcher Test ===\n")
console.log("Subscriptions:", subs.map((s) => `${s.name} (${s.amountInr} INR, ${s.status})`).join(", "))
console.log()

const counts = { matched: 0, needs_review: 0, unmatched: 0, ghost: 0, duplicate: 0 }

for (const tx of transactions) {
  const result = match(tx, subs, transactions)
  counts[result.status]++
  if (result.isGhost) counts.ghost++
  if (result.isDuplicate) counts.duplicate++

  const matchedTo = result.bestSub ? ` → ${result.bestSub.name} (sim: ${result.bestScore.toFixed(2)})` : " → NO MATCH"
  console.log(`[${result.status.toUpperCase().padEnd(12)}] ${tx.vendorRaw.padEnd(30)} ${matchedTo}`)
  console.log(`               Reason: ${result.reason}`)
  console.log()
}

console.log("=== Summary ===")
console.log(`Total transactions  : ${transactions.length}`)
console.log(`Matched             : ${counts.matched}`)
console.log(`Needs Review        : ${counts.needs_review}`)
console.log(`Unmatched           : ${counts.unmatched}`)
console.log(`Ghost subscriptions : ${counts.ghost}`)
console.log(`Duplicate charges   : ${counts.duplicate}`)
console.log()
console.log("Expected results:")
console.log("  tx-1 → matched        (exact Notion)")
console.log("  tx-2 → matched        (fuzzy GITHUB INC → GitHub)")
console.log("  tx-3 → needs_review   (Figma name match but amount drift)")
console.log("  tx-4a → needs_review  (Vercel duplicate #1)")
console.log("  tx-4b → needs_review  (Vercel duplicate #2, escalated)")
console.log("  tx-5 → needs_review   (Zoom ghost subscription — cancelled)")
console.log("  tx-6 → unmatched      (XYZABC — no match)")
