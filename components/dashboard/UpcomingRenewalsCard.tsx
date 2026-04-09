import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UpcomingRenewalsCardProps = {
  count: number
  windowDays?: number
}

export function UpcomingRenewalsCard({ count, windowDays = 30 }: UpcomingRenewalsCardProps) {
  return (
    <Card className="rounded-3xl border-border/70">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-mono uppercase tracking-wide">
          Upcoming Renewals
        </CardDescription>
        <CardTitle className="font-serif text-2xl">{count}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Renewals due in the next {windowDays} days.</p>
      </CardContent>
    </Card>
  )
}
