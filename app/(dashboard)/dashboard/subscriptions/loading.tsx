import { SkeletonKanbanColumn } from "@/components/ui/SkeletonCard"

export default function SubscriptionsLoading() {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      {/* Page header skeleton */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm animate-pulse">
        <div>
          <div className="h-3 w-28 bg-muted mb-2" />
          <div className="h-8 w-48 bg-muted mb-1" />
          <div className="h-4 w-40 bg-muted" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-muted" />
          <div className="h-9 w-40 bg-muted" />
        </div>
      </div>

      {/* Kanban Board Skeleton */}
      <div className="flex gap-4 overflow-hidden">
        <SkeletonKanbanColumn />
        <SkeletonKanbanColumn />
        <SkeletonKanbanColumn />
      </div>
    </div>
  )
}
