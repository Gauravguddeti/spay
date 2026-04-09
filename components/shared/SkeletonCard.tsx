import { cn } from "@/lib/utils"

type Props = {
  lines?: number
  className?: string
}

export function SkeletonCard({ lines = 3, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-3",
        className,
      )}
    >
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          className="h-4 animate-pulse rounded bg-muted"
          key={i}
          style={{ width: `${60 + (i % 3) * 15}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-2">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
    </div>
  )
}
