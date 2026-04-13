"use client"

import type { ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"

type DashboardPageTransitionProps = {
  children: ReactNode
}

export function DashboardPageTransition({ children }: DashboardPageTransitionProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`

  return (
    <div
      key={routeKey}
      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
    >
      {children}
    </div>
  )
}
