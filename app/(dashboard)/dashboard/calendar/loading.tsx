import { SkeletonCard } from "@/components/ui/SkeletonCard"

export default function CalendarLoading() {
  return (
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm animate-pulse">
        <div className="h-3 w-32 bg-muted mb-2" />
        <div className="h-8 w-56 bg-muted mb-2" />
        <div className="h-4 w-72 bg-muted" />
      </div>

      <div className="rounded-none border border-border/70 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`calendar-header-${index}`} className="h-7 rounded-none bg-muted animate-pulse" />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, index) => (
            <div key={`calendar-cell-${index}`} className="h-10 rounded-none bg-muted animate-pulse" />
          ))}
        </div>
      </div>

      <SkeletonCard lines={3} />
    </section>
  )
}
