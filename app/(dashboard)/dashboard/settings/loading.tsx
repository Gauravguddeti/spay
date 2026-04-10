import { SkeletonCard } from "@/components/ui/SkeletonCard"

export default function SettingsLoading() {
  return (
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm animate-pulse">
        <div className="h-3 w-28 bg-muted mb-2" />
        <div className="h-8 w-48 bg-muted mb-1" />
        <div className="h-4 w-64 bg-muted" />
      </div>

      <SkeletonCard lines={6} />
    </section>
  )
}
