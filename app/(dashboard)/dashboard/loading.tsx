import { SkeletonCard } from "@/components/ui/SkeletonCard"

export default function DashboardLoading() {
  return (
    <section className="space-y-4">
      {/* Header bar skeleton */}
      <div className="flex items-start justify-between rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm animate-pulse">
        <div>
          <div className="h-3 w-24 bg-muted mb-2" />
          <div className="h-8 w-40 bg-muted" />
        </div>
        <div className="h-9 w-28 bg-muted" />
      </div>

      {/* AI Insights skeleton */}
      <div className="space-y-3">
        <div className="h-2 w-20 bg-muted mb-1 ml-1" />
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-4 rounded-none border px-5 py-4 border-border/40 bg-muted/20 animate-pulse">
            <div className="mt-1.5 h-2 w-2 shrink-0 bg-muted" />
            <div className="w-full">
              <div className="h-4 w-1/3 bg-muted mb-2" />
              <div className="h-3 w-2/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Renewals skeleton */}
      <SkeletonCard lines={4} className="mt-4" />
    </section>
  )
}
