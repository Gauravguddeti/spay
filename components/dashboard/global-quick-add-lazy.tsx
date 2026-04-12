"use client"

import dynamic from "next/dynamic"

const GlobalQuickAdd = dynamic(
  () => import("@/components/dashboard/GlobalQuickAdd").then((module) => ({ default: module.GlobalQuickAdd })),
  {
    ssr: false,
  },
)

export function GlobalQuickAddLazy() {
  return <GlobalQuickAdd />
}
