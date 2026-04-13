import { NavLink, type NavIconName } from "@/components/dashboard/nav-link"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { href: "/dashboard/calendar", label: "Renewal Calendar", icon: "calendar" },
  { href: "/dashboard/import", label: "Import PDF", icon: "import" },
  { href: "/dashboard/connect", label: "Connect Gmail", icon: "connect" },
  { href: "/dashboard/insights", label: "Insights", icon: "insights" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
] satisfies ReadonlyArray<{ href: string; label: string; icon: NavIconName }>

type SidebarNavProps = {
  mobile?: boolean
  userName?: string
  userEmail?: string
}

export function SidebarNav({ mobile = false, userName, userEmail }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "relative mb-6 overflow-hidden border-b motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300 [border-color:var(--border-subtle)]",
          mobile ? "mb-6 pt-6 pb-6" : "mb-6 pt-2 pb-6",
        )}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-28 w-full bg-[radial-gradient(circle_at_top_left,rgba(90,144,120,0.06),transparent_70%)]" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <p className="font-serif text-xl font-extrabold tracking-tight text-[var(--text-primary)]">SPAY</p>
            <span className="h-1.5 w-1.5 bg-[var(--accent-primary)]" />
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--text-faint)]">Spend Intelligence</p>
        </div>
      </div>

      <nav className={cn("space-y-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300", mobile && "mt-4")}>
        {navItems.map((item, index) => (
          <div
            key={item.href}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <NavLink
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          </div>
        ))}
      </nav>

      {userName && userEmail ? (
        <div className="mt-auto border-t bg-[var(--surface-overlay)] px-3 py-4 [border-color:var(--border-subtle)]">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{userName}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{userEmail}</p>
        </div>
      ) : null}
    </div>
  )
}
