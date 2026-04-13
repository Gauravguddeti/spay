"use client"

import {
  BarChart3,
  CalendarClock,
  CreditCard,
  FileSearch,
  FileText,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const iconMap = {
  dashboard: LayoutDashboard,
  subscriptions: CreditCard,
  calendar: CalendarClock,
  import: FileText,
  connect: FileSearch,
  insights: BarChart3,
  settings: Settings,
} as const

export type NavIconName = keyof typeof iconMap

type NavLinkProps = {
  href: string
  label: string
  icon: NavIconName
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname()
  const Icon = iconMap[icon]
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname?.startsWith(`${href}/`))

  return (
    <Link
      className={cn(
        "flex items-center gap-2 border-l-2 px-3 py-2 text-sm uppercase tracking-wider transition-all duration-200 ease-out",
        isActive
          ? "border-l-[var(--accent-primary)] bg-[var(--accent-primary-muted)] font-medium text-[var(--accent-primary)]"
          : "border-l-transparent text-[var(--text-muted)] hover:border-l-[var(--accent-primary)] hover:bg-[var(--accent-primary-muted)] hover:text-[var(--text-primary)]",
      )}
      href={href}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}
