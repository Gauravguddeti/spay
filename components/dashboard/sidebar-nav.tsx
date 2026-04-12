import {
  BarChart3,
  CalendarClock,
  CreditCard,
  FileSearch,
  FileText,
  LayoutDashboard,
  Settings,
} from "lucide-react"

import { NavLink } from "@/components/dashboard/nav-link"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dashboard/calendar", label: "Renewal Calendar", icon: CalendarClock },
  { href: "/dashboard/import", label: "Import PDF", icon: FileText },
  { href: "/dashboard/connect", label: "Connect Gmail", icon: FileSearch },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div
        className={cn(
          "border-b border-border/70",
          mobile ? "mb-6 pt-6 pb-6" : "mb-6 pt-2 pb-6",
        )}
      >
        <p className="font-serif text-3xl font-extrabold tracking-tighter">SPAY</p>
        <p className="mt-1 text-xs font-mono text-muted-foreground uppercase tracking-widest text-[#5a9078]">
          Control Center
        </p>
      </div>

      <nav className={cn("space-y-1", mobile && "mt-4")}>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </nav>
    </>
  )
}
