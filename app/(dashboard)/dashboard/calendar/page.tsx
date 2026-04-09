import { redirect } from "next/navigation"
import { differenceInCalendarDays, format, isSameDay } from "date-fns"
import { CalendarIcon, IndianRupee } from "lucide-react"

import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { CalendarRenewalView } from "@/components/dashboard/CalendarRenewalView"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  if (daysLeft <= 3) return "bg-red-500/20 text-red-800 border-red-200"
  if (daysLeft <= 7) return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-emerald-100 text-emerald-800 border-emerald-200"
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
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">RENEWAL CALENDAR</p>
        <h1 className="mt-2 font-serif text-3xl">Upcoming Renewals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All subscriptions renewing in the next 30 days
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        {/* Interactive calendar — client component */}
        <CalendarRenewalView
          orgId={organization.id}
          renewalDates={renewalDates.map((d) => d.toISOString())}
          renewals={renewalItems}
        />

        {/* Renewal list */}
        <div className="rounded-none border border-border/70 bg-card p-4 shadow-sm">
          <p className="mb-4 text-xs font-mono text-muted-foreground">NEXT 30 DAYS</p>

          {renewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">
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
                  <Card
                    className={`rounded-none border-border/70 ${daysLeft <= 7 ? "border-red-200 bg-red-50/40" : ""}`}
                    key={renewal.id}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-medium">
                          {renewal.name}
                        </CardTitle>
                        <Badge className={urgencyClass(daysLeft)} variant="outline">
                          {isToday
                            ? "Today"
                            : daysLeft === 1
                              ? "Tomorrow"
                              : `${daysLeft}d`}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {renewal.category ?? "Uncategorized"} ·{" "}
                        {format(renewalDate, "dd MMM yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {formatInr(renewal.amountInr).replace("₹", "")}
                        <span className="ml-1 text-xs font-normal text-muted-foreground capitalize">
                          / {renewal.billingCycle}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}