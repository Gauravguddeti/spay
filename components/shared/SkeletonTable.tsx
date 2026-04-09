import { cn } from "@/lib/utils"

type Props = {
  rows?: number
  cols?: number
  className?: string
}

export function SkeletonTable({ rows = 5, cols = 6, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-none border border-border/70 bg-card p-6 shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-4 flex justify-between">
        <div className="h-7 w-32 animate-pulse rounded-none bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-none bg-muted" />
      </div>

      {/* Table header */}
      <div className="mb-2 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div className="h-3 animate-pulse rounded bg-muted/60" key={i} />
        ))}
      </div>

      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            className="grid gap-4 border-t border-border/50 pt-3"
            key={rowIdx}
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                className="h-4 animate-pulse rounded bg-muted"
                key={colIdx}
                style={{ width: `${50 + ((rowIdx + colIdx) % 4) * 12}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
