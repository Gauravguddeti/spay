import { redirect } from "next/navigation"
import { differenceInCalendarDays, format, isSameDay } from "date-fns"
import { CalendarIcon, IndianRupee } from "lucide-react"

import { auth } from "@/auth"
import { CalendarRenewalView } from "@/components/dashboard/CalendarRenewalView"
import { getUpcomingRenewals } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

function formatInr(amount: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 3) return "text-[var(--status-danger)]"
  if (daysLeft <= 7) return "text-[var(--status-warning)]"
  return "text-[var(--status-success)]"
}

function urgencyBorderClass(daysLeft: number): string {
  if (daysLeft <= 3) return "[border-left-color:var(--status-danger)]"
  if (daysLeft <= 7) return "[border-left-color:var(--status-warning)]"
  return "[border-left-color:var(--status-success)]"
}

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const organization = await getOrganizationByOwnerId(session.user.id)
  if (!organization) redirect("/login")

  const renewals = await getUpcomingRenewals(organization.id)

  const today = new Date()

  const renewalDates = renewals
    .filter((r) => r.nextRenewalDate)
    .map((r) => new Date(r.nextRenewalDate!))

  // Serialise renewal data for client component
  const renewalItems = renewals.map((r) => ({
    id: r.id,
    name: r.name,
    amountInr: r.amountInr,
    billingCycle: r.billingCycle,
    category: r.category,
    nextRenewalDate: r.nextRenewalDate
      ? new Date(r.nextRenewalDate).toISOString()
      : null,
  }))

  return (
    <section className="space-y-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      <div className="rounded-none border bg-[var(--surface-raised)] px-6 py-5 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
        <div className="accent-line" />
        <h1 className="font-serif text-2xl font-bold tracking-tight text-white">Renewal Calendar</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Upcoming renewals in the next 30 days</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Interactive calendar — client component */}
        <CalendarRenewalView
          orgId={organization.id}
          renewalDates={renewalDates.map((d) => d.toISOString())}
          renewals={renewalItems}
        />

        {/* Renewal list */}
        <div className="rounded-none border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)] lg:border-l lg:[border-left-color:var(--border-subtle)]">
          <div className="mb-4">
            <div className="accent-line" />
            <h2 className="font-serif text-xl font-bold tracking-tight text-white">Next 30 Days</h2>
          </div>

          {renewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--text-muted)]">
              <CalendarIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                You&apos;re all clear this month 🎉
              </p>
              <p className="text-xs">No renewals in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {renewals.map((renewal) => {
                if (!renewal.nextRenewalDate) return null
                const renewalDate = new Date(renewal.nextRenewalDate)
                const daysLeft = differenceInCalendarDays(renewalDate, today)
                const isToday = isSameDay(renewalDate, today)

                return (
                  <div
                    className={`rounded-none border border-l-[3px] px-4 py-3 [background:var(--surface-overlay)] [border-color:var(--border-subtle)] ${urgencyBorderClass(daysLeft)}`}
                    key={renewal.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{renewal.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {renewal.category ?? "Uncategorized"} · {format(renewalDate, "dd MMM yyyy")}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-[var(--text-accent)]">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {formatInr(renewal.amountInr).replace("₹", "")}
                          <span className="ml-1 text-xs font-normal text-[var(--text-muted)] capitalize">
                            / {renewal.billingCycle}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`font-display text-2xl font-bold leading-none ${urgencyClass(daysLeft)}`}>
                          {isToday ? 0 : Math.max(daysLeft, 0)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          {isToday ? "Today" : daysLeft === 1 ? "Day left" : "Days left"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}