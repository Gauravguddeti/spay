"use client"

import { useState } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import { IndianRupee, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type RenewalItem = {
  id: string
  name: string
  amountInr: string
  billingCycle: string
  category: string | null
  nextRenewalDate: string | null
}

type Props = {
  renewalDates: string[]
  renewals: RenewalItem[]
  orgId: string
}

function urgencyClass(daysLeft: number) {
  if (daysLeft <= 3) return "bg-red-500/20 text-red-800 border-red-200"
  if (daysLeft <= 7) return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-emerald-100 text-emerald-800 border-emerald-200"
}

function urgencyDotClass(daysLeft: number) {
  if (daysLeft <= 7) return "bg-red-500"
  if (daysLeft <= 30) return "bg-amber-500"
  return "bg-emerald-500"
}

function formatInr(amount: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function CalendarRenewalView({ renewalDates, renewals, orgId }: Props) {
  const parsedDates = renewalDates.map((d) => new Date(d))
  const today = new Date()

  // Build map: dateKey → renewals
  const renewalMap = new Map<string, RenewalItem[]>()
  for (const r of renewals) {
    if (!r.nextRenewalDate) continue
    const key = format(new Date(r.nextRenewalDate), "yyyy-MM-dd")
    renewalMap.set(key, [...(renewalMap.get(key) ?? []), r])
  }

  const [cancellingId, setCancellingId] = useState<string | null>(null)

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
      } else {
        toast.error("Failed to cancel subscription")
      }
    } catch {
      toast.error("Network error, please try again")
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="rounded-none border border-border/70 bg-card p-4 shadow-sm">
      <Calendar
        className="rounded-none"
        mode="multiple"
        selected={parsedDates}
        modifiers={{ renewal: parsedDates }}
        modifiersClassNames={{ renewal: "font-bold text-primary" }}
        components={{
          // Override the day cell to inject popover dots
          // Using 'Day' render prop which is stable in react-day-picker v9
          Day: ({ day, ...dayProps }: { day: { date: Date; outside?: boolean }; modifiers?: Record<string, boolean> } & React.HTMLAttributes<HTMLTableCellElement>) => {
            const date = day.date
            const key = format(date, "yyyy-MM-dd")
            const items = renewalMap.get(key) ?? []
            const daysLeft = differenceInCalendarDays(date, today)
            const hasRenewal = items.length > 0

            if (!hasRenewal) {
              return (
                <td {...dayProps}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-none text-sm">
                    {date.getDate()}
                  </div>
                </td>
              )
            }

            return (
              <td {...dayProps}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="relative flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-none text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                      type="button"
                    >
                      <span>{date.getDate()}</span>
                      <span
                        className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-none ${urgencyDotClass(daysLeft)}`}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 rounded-none border-border/70 bg-card p-4 shadow-lg">
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-muted-foreground">
                        {format(date, "dd MMM yyyy")} · {items.length} renewal
                        {items.length !== 1 ? "s" : ""}
                      </p>
                      {items.map((renewal) => (
                        <div
                          className="flex items-start justify-between gap-2 rounded-none border border-border/70 p-3"
                          key={renewal.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {renewal.name}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <IndianRupee className="h-3 w-3" />
                              <span>
                                {formatInr(renewal.amountInr).replace("₹", "")}
                              </span>
                              <span className="capitalize">
                                / {renewal.billingCycle}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <Badge
                              className={urgencyClass(daysLeft)}
                              variant="outline"
                            >
                              {daysLeft === 0
                                ? "Today"
                                : daysLeft === 1
                                  ? "Tomorrow"
                                  : `${daysLeft}d`}
                            </Badge>
                            <button
                              className="flex items-center gap-1 rounded-none bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              disabled={cancellingId === renewal.id}
                              onClick={() => void handleCancel(renewal.id)}
                              type="button"
                            >
                              <X className="h-3 w-3" />
                              {cancellingId === renewal.id ? "…" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </td>
            )
          },
        } as React.ComponentProps<typeof Calendar>["components"]}
      />
    </div>
  )
}
