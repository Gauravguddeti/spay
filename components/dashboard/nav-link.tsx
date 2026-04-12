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
        "flex items-center gap-2 rounded-none px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
      href={href}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}
