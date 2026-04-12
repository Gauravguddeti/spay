import { SkeletonCard } from "@/components/ui/SkeletonCard"

export default function InsightsLoading() {
  return (
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm animate-pulse">
        <div className="h-3 w-20 bg-muted mb-2" />
        <div className="h-8 w-52 bg-muted mb-2" />
        <div className="h-4 w-72 bg-muted" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>

      <div className="space-y-3">
        <div className="rounded-none border border-border/70 bg-card p-4 shadow-sm animate-pulse">
          <div className="h-3 w-24 bg-muted mb-3" />
          <div className="h-48 w-full bg-muted" />
        </div>
        <div className="rounded-none border border-border/70 bg-card p-4 shadow-sm animate-pulse">
          <div className="h-3 w-24 bg-muted mb-3" />
          <div className="h-48 w-full bg-muted" />
        </div>
      </div>
    </section>
  )
}
