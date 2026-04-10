"use client"

import { Plus } from "lucide-react"

interface QuickAddButtonProps {
  onClick: () => void
}

export function QuickAddButton({ onClick }: QuickAddButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Add subscription"
      className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-none border-2 border-primary bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
