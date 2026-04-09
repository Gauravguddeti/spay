import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const organization = await getOrganizationByOwnerId(session.user.id)

  if (!organization) {
    redirect("/login")
  }

  const stats = await getDashboardStats(organization.id)

  const cards = [
    {
      title: "Total Monthly Spend",
      value: formatInr(stats.totalMonthlySpendInr),
      description: "Active monthly + annual/12",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptionsCount.toString(),
      description: "Currently billing tools",
    },
    {
      title: "Renewing This Month",
      value: stats.renewingThisMonthCount.toString(),
      description: "Next 30 days",
    },
    {
      title: "Potential Savings",
      value: `${stats.potentialSavingsCount} tools • ${formatInr(stats.potentialSavingsInr)}`,
      description: "Unused for 45+ days",
    },
  ]

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">SPEND OVERVIEW</p>
        <h1 className="mt-2 font-serif text-3xl">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card className="rounded-3xl border-border/70" key={card.title}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-mono uppercase tracking-wide">
                {card.title}
              </CardDescription>
              <CardTitle className="font-serif text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}