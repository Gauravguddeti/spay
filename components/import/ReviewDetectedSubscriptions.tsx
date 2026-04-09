"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckSquare, Square, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type DetectedItem = {
  vendorKey: string
  name: string
  amountInr: number
  originalAmount: number
  originalCurrency: string
  date: string | null
  confidence: "high" | "medium" | "low"
  category: string
}

const CATEGORIES = [
  "Productivity",
  "Design",
  "Communication",
  "DevTools",
  "Marketing",
  "Finance",
  "Other",
] as const

function confidenceColor(c: "high" | "medium" | "low") {
  if (c === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (c === "medium") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-red-500/20 text-red-800 border-red-200"
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

type Props = {
  items: DetectedItem[]
  detectedVia?: "pdf" | "gmail"
  onImportDone?: () => void
}

export function ReviewDetectedSubscriptions({
  items,
  detectedVia = "pdf",
  onImportDone,
}: Props) {
  const router = useRouter()

  const [selected, setSelected] = useState<Set<string>>(
    new Set(items.filter((i) => i.confidence === "high").map((i) => i.vendorKey)),
  )
  const [categories, setCategories] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.vendorKey, i.category])),
  )
  const [importing, setImporting] = useState(false)

  const allSelected = selected.size === items.length
  const someSelected = selected.size > 0

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(items.map((i) => i.vendorKey)),
    )
  }

  function toggleItem(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleImport() {
    const toImport = items.filter((i) => selected.has(i.vendorKey))
    if (toImport.length === 0) return

    setImporting(true)
    try {
      const res = await fetch("/api/subscriptions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptions: toImport.map((i) => ({
            name: i.name,
            amountInr: i.amountInr,
            category: categories[i.vendorKey] ?? i.category,
            date: i.date,
            detectedVia,
            originalAmount: i.originalAmount,
            originalCurrency: i.originalCurrency,
          })),
        }),
      })

      const data = (await res.json()) as { inserted?: number; error?: string }

      if (!res.ok) {
        toast.error(data.error ?? "Import failed")
        return
      }

      toast.success(`${data.inserted ?? toImport.length} subscriptions imported!`)
      onImportDone?.()
      router.push("/dashboard/subscriptions")
      router.refresh()
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setImporting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-none border border-border/70 bg-card px-6 py-12 text-center shadow-sm">
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-40" />
        <p className="font-medium">No subscriptions detected</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try uploading a different statement, or add subscriptions manually.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-none border border-border/70 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground">REVIEW DETECTED</p>
          <p className="mt-1 font-serif text-xl">
            {items.length} subscription{items.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="rounded-none"
            onClick={toggleAll}
            size="sm"
            variant="outline"
          >
            {allSelected ? (
              <CheckSquare className="mr-1.5 h-4 w-4" />
            ) : (
              <Square className="mr-1.5 h-4 w-4" />
            )}
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button
            className="rounded-none"
            disabled={!someSelected || importing}
            onClick={handleImport}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {importing
              ? "Importing..."
              : `Import ${selected.size} subscription${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Tool Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date Detected</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = selected.has(item.vendorKey)
            return (
              <TableRow
                className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                key={item.vendorKey}
                onClick={() => toggleItem(item.vendorKey)}
              >
                <TableCell>
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.originalCurrency !== "INR" && (
                    <p className="text-xs text-muted-foreground">
                      {item.originalCurrency} {item.originalAmount}
                    </p>
                  )}
                </TableCell>
                <TableCell className="font-medium">{formatInr(item.amountInr)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.date ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={confidenceColor(item.confidence)}
                    variant="outline"
                  >
                    {item.confidence.charAt(0).toUpperCase() + item.confidence.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    onValueChange={(val) =>
                      setCategories((prev) => ({ ...prev, [item.vendorKey]: val }))
                    }
                    value={categories[item.vendorKey] ?? item.category}
                  >
                    <SelectTrigger className="h-8 w-36 rounded-none text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
