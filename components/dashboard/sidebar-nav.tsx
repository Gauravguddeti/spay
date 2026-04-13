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

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div
        className={cn(
          "border-b border-border/70 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300",
          mobile ? "mb-6 pt-6 pb-6" : "mb-6 pt-2 pb-6",
        )}
      >
        <p className="font-serif text-3xl font-extrabold tracking-tighter">SPAY</p>
        <p className="mt-1 text-xs font-mono text-muted-foreground uppercase tracking-widest text-[#5a9078]">
          Control Center
        </p>
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
    </>
  )
}
