"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, XCircle, RotateCcw, GitMerge, Loader2, ArrowRight, TrendingUp, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types (mirrors GET /api/reconciliation/queue response)
// ---------------------------------------------------------------------------

type QueueRow = {
  matchId: string
  status: string
  confidenceScore: string | null
  matchReason: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
  // Bank transaction
  txId: string
  txVendorRaw: string
  txVendorNormalized: string
  txAmount: string
  txCurrency: string
  txDate: string | null
  txSource: string
  // Matched subscription
  subId: string | null
  subName: string | null
  subAmountInr: string | null
  subStatus: string | null
  subBillingCycle: string | null
}

type QueueData = {
  queue: {
    matched: QueueRow[]
    needs_review: QueueRow[]
    unmatched: QueueRow[]
    resolved: QueueRow[]
  }
  counts: {
    matched: number
    needs_review: number
    unmatched: number
    resolved: number
    total: number
  }
}

type Tab = "needs_review" | "matched" | "unmatched" | "resolved"

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ score }: { score: string | null }) {
  const pct = score ? Math.round(parseFloat(score) * 100) : 0
  const color =
    pct >= 90 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
    pct >= 60 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
                "text-rose-400 bg-rose-400/10 border-rose-400/20"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono font-semibold", color)}>
      <TrendingUp className="h-3 w-3" />
      {pct}%
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    matched: { label: "Matched", icon: <CheckCircle2 className="h-3 w-3" />, className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    needs_review: { label: "Needs Review", icon: <AlertCircle className="h-3 w-3" />, className: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    unmatched: { label: "Unmatched", icon: <XCircle className="h-3 w-3" />, className: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
    resolved: { label: "Resolved", icon: <Shield className="h-3 w-3" />, className: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  }
  const c = config[status] ?? config.unmatched
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", c.className)}>
      {c.icon}
      {c.label}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      {source}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatAmount(amount: string | null, currency = "INR") {
  if (!amount) return "—"
  const num = parseFloat(amount)
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num)
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function QueueRowCard({ row, onResolve }: { row: QueueRow; onResolve: (id: string, status: "resolved" | "matched" | "unmatched") => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const canResolve = row.status === "needs_review" || row.status === "unmatched"

  const handleResolve = async (status: "resolved" | "matched" | "unmatched") => {
    setLoading(true)
    try {
      await onResolve(row.matchId, status)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-none border border-border/60 bg-card p-4 transition-colors hover:border-border">
      {/* Top row: status + confidence + reason */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status} />
        <ConfidenceBadge score={row.confidenceScore} />
        <SourceBadge source={row.txSource} />
        {row.matchReason && (
          <span className="text-xs text-muted-foreground italic truncate max-w-xs">
            {row.matchReason}
          </span>
        )}
      </div>

      {/* Side-by-side: transaction vs subscription */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Bank Transaction */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Bank Transaction</p>
          <p className="font-semibold text-sm">{row.txVendorRaw}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.txVendorNormalized}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold">{formatAmount(row.txAmount, row.txCurrency)}</span>
            <span className="text-xs text-muted-foreground">{formatDate(row.txDate)}</span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />

        {/* Matched Subscription */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Matched Subscription</p>
          {row.subId ? (
            <>
              <p className="font-semibold text-sm">{row.subName}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{formatAmount(row.subAmountInr)}</span>
                {row.subBillingCycle && (
                  <Badge variant="outline" className="rounded-none text-[10px]">
                    {row.subBillingCycle}
                  </Badge>
                )}
              </div>
              {row.subStatus === "cancelled" && (
                <span className="text-xs text-rose-400 font-semibold">⚠ Cancelled — ghost subscription</span>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No match found</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {canResolve && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
          <Button
            className="rounded-none h-7 text-xs"
            disabled={loading}
            onClick={() => handleResolve("resolved")}
            size="sm"
            variant="default"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Mark Resolved
          </Button>
          {row.subId && (
            <Button
              className="rounded-none h-7 text-xs"
              disabled={loading}
              onClick={() => handleResolve("matched")}
              size="sm"
              variant="outline"
            >
              Confirm Match
            </Button>
          )}
          <Button
            className="rounded-none h-7 text-xs"
            disabled={loading}
            onClick={() => handleResolve("unmatched")}
            size="sm"
            variant="ghost"
          >
            Mark Unmatched
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReconciliationQueue({ initialData }: { initialData: QueueData }) {
  const [data, setData] = useState<QueueData>(initialData)
  const [activeTab, setActiveTab] = useState<Tab>("needs_review")
  const [running, setRunning] = useState(false)

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "needs_review", label: "Needs Review", icon: <AlertCircle className="h-3.5 w-3.5" />, count: data.counts.needs_review },
    { key: "matched", label: "Matched", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: data.counts.matched },
    { key: "unmatched", label: "Unmatched", icon: <XCircle className="h-3.5 w-3.5" />, count: data.counts.unmatched },
    { key: "resolved", label: "Resolved", icon: <Shield className="h-3.5 w-3.5" />, count: data.counts.resolved },
  ]

  const rows = data.queue[activeTab] ?? []

  const handleRunMatcher = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/reconciliation/run", { method: "POST" })
      if (!res.ok) return
      // Refresh queue
      const qRes = await fetch("/api/reconciliation/queue")
      if (qRes.ok) setData(await qRes.json())
    } finally {
      setRunning(false)
    }
  }

  const handleResolve = async (matchId: string, status: "resolved" | "matched" | "unmatched") => {
    const res = await fetch(`/api/reconciliation/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    // Refresh queue
    const qRes = await fetch("/api/reconciliation/queue")
    if (qRes.ok) setData(await qRes.json())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitMerge className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Reconciliation</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Match bank transactions against your tracked subscriptions. {data.counts.total} total entries.
          </p>
        </div>
        <Button
          className="rounded-none"
          disabled={running}
          onClick={handleRunMatcher}
          variant="default"
        >
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Run Matcher
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex flex-col items-start rounded-none border p-3 text-left transition-colors",
              activeTab === tab.key
                ? "border-primary/60 bg-primary/5"
                : "border-border/60 bg-card hover:border-border",
            )}
          >
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1",
              tab.key === "needs_review" ? "text-amber-400" :
              tab.key === "matched" ? "text-emerald-400" :
              tab.key === "unmatched" ? "text-rose-400" : "text-sky-400"
            )}>
              {tab.icon}
              {tab.label}
            </div>
            <p className="text-2xl font-bold font-mono">{tab.count}</p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-border/60 py-16 text-center">
            <GitMerge className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No items in this category</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Import a bank statement or run the matcher to populate this queue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <QueueRowCard key={row.matchId} onResolve={handleResolve} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
