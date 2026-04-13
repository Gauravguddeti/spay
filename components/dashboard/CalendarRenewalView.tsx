"use client"

import { useEffect, useState } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import { IndianRupee, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
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
  if (daysLeft <= 3) return "[background:var(--status-danger-bg)] [border-color:var(--status-danger-border)] text-[var(--status-danger)]"
  if (daysLeft <= 7) return "[background:var(--status-warning-bg)] [border-color:var(--status-warning-border)] text-[var(--status-warning)]"
  return "[background:var(--status-success-bg)] [border-color:var(--status-success-border)] text-[var(--status-success)]"
}

function urgencyDotClass(daysLeft: number) {
  if (daysLeft <= 3) return "bg-[var(--status-danger)]"
  if (daysLeft <= 7) return "bg-[var(--status-warning)]"
  return "bg-[var(--accent-primary)]"
}

function formatInr(amount: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function CalendarRenewalView({ renewalDates: _renewalDates, renewals, orgId: _orgId }: Props) {
  const [calendarRenewals, setCalendarRenewals] = useState<RenewalItem[]>(renewals)
  const today = new Date()

  useEffect(() => {
    setCalendarRenewals(renewals)
  }, [renewals])

  // Build map: dateKey → renewals
  const renewalMap = new Map<string, RenewalItem[]>()
  for (const r of calendarRenewals) {
    if (!r.nextRenewalDate) continue
    const key = format(new Date(r.nextRenewalDate), "yyyy-MM-dd")
    renewalMap.set(key, [...(renewalMap.get(key) ?? []), r])
  }
  const parsedDates = Array.from(renewalMap.keys()).map((dateKey) => new Date(dateKey))

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
        setCalendarRenewals((prev) => prev.filter((item) => item.id !== subscriptionId))
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
    <div className="rounded-none border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
      <Calendar
        className="rounded-none"
        mode="multiple"
        selected={parsedDates}
        modifiers={{ renewal: parsedDates }}
        modifiersClassNames={{ renewal: "font-bold text-[var(--accent-primary)]" }}
        components={{
          // Override the day cell to inject popover dots
          // Using 'Day' render prop which is stable in react-day-picker v9
          Day: ({ day, ...dayProps }: { day: { date: Date; outside?: boolean }; modifiers?: Record<string, boolean> } & React.HTMLAttributes<HTMLTableCellElement>) => {
            const date = day.date
            const key = format(date, "yyyy-MM-dd")
            const items = renewalMap.get(key) ?? []
            const daysLeft = differenceInCalendarDays(date, today)
            const hasRenewal = items.length > 0
            const isToday = Boolean(dayProps.modifiers?.today)

            if (!hasRenewal) {
              return (
                <td {...dayProps}>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-none border border-transparent text-sm text-[var(--text-secondary)]",
                      isToday && "[background:var(--accent-primary-muted)] [border-color:var(--accent-primary-border)] text-[var(--text-primary)]",
                    )}
                  >
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
                      className={cn(
                        "relative flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-none border border-transparent text-sm font-semibold text-[var(--text-primary)] transition-colors hover:[background:var(--surface-overlay)]",
                        isToday && "[background:var(--accent-primary-muted)] [border-color:var(--accent-primary-border)]",
                      )}
                      type="button"
                    >
                      <span>{date.getDate()}</span>
                      <span
                        className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-none ${urgencyDotClass(daysLeft)}`}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 rounded-none border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-lg)] [border-color:var(--border-subtle)]">
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-[var(--text-muted)]">
                        {format(date, "dd MMM yyyy")} · {items.length} renewal
                        {items.length !== 1 ? "s" : ""}
                      </p>
                      {items.map((renewal) => (
                        <div
                          className="flex items-start justify-between gap-2 rounded-none border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:[border-color:var(--border-accent)] hover:shadow-[var(--shadow-accent)] [background:var(--surface-overlay)] [border-color:var(--border-subtle)]"
                          key={renewal.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {renewal.name}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
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
                              className="flex items-center gap-1 rounded-none border px-2 py-1 text-xs transition-colors disabled:opacity-50 [background:var(--status-danger-bg)] [border-color:var(--status-danger-border)] text-[var(--status-danger)] hover:opacity-90"
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
