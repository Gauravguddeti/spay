"use client"

import { cn } from "@/lib/utils"

interface SkeletonCardProps {
  className?: string
  lines?: number
}

export function SkeletonCard({ className, lines = 2 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-none border border-border/70 bg-card p-5 shadow-sm animate-pulse motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
        className,
      )}
    >
      <div className="h-2.5 w-24 rounded-none bg-muted mb-3" />
      <div className="h-7 w-32 rounded-none bg-muted mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-none bg-muted mb-2 ${i === lines - 1 ? "w-3/5" : "w-4/5"}`}
        />
      ))}
    </div>
  )
}

export function SkeletonKanbanCard() {
  return (
    <div className="rounded-none border border-border bg-card p-3 shadow-sm animate-pulse motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      <div className="h-2 w-16 rounded-none bg-muted mb-2" />
      <div className="h-4 w-3/4 rounded-none bg-muted mb-2" />
      <div className="h-3 w-1/2 rounded-none bg-muted" />
    </div>
  )
}

export function SkeletonKanbanColumn() {
  return (
    <div className="min-w-[280px] w-[280px] space-y-2 rounded-none border-2 border-transparent bg-muted/50 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="h-3 w-3 rounded-none bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded-none bg-muted animate-pulse" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonKanbanCard key={i} />
      ))}
    </div>
  )
}
