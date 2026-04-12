"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavLinkProps = {
  href: string
  label: string
  icon: LucideIcon
}

export function NavLink({ href, label, icon: Icon }: NavLinkProps) {
  const pathname = usePathname()
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
