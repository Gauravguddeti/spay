"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { BarChart3, CalendarClock, CreditCard, FileSearch, FileText, LayoutDashboard, LogOut, Menu, PlugZap, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { APP_NAME, DASHBOARD_SIDEBAR_TITLE, ORG_LABEL } from "@/lib/utils/constants"

type DashboardShellProps = {
  children: React.ReactNode
  orgName: string
  userName: string
  userEmail: string
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dashboard/calendar", label: "Renewal Calendar", icon: CalendarClock },
  { href: "/dashboard/import", label: "Import PDF", icon: FileText },
  { href: "/dashboard/connect", label: "Connect Gmail", icon: FileSearch },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={cn("space-y-1", mobile && "mt-4")}> 
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            href={item.href}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardShell({ children, orgName, userName, userEmail }: DashboardShellProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 rounded-3xl border border-border/70 bg-card p-4 shadow-sm md:block">
          <div className="mb-6 border-b border-border/70 pb-4">
            <p className="text-xs font-mono text-muted-foreground">{APP_NAME.toUpperCase()}</p>
            <p className="mt-2 font-serif text-xl">{DASHBOARD_SIDEBAR_TITLE}</p>
          </div>
          <Navigation />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between rounded-3xl border border-border/70 bg-card px-4 py-3 shadow-sm md:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="md:hidden" size="icon" variant="outline">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-70 border-l-border/70 bg-card" side="left">
                  <div className="pt-6">
                    <p className="text-xs font-mono text-muted-foreground">{APP_NAME.toUpperCase()}</p>
                    <p className="mt-2 font-serif text-xl">{DASHBOARD_SIDEBAR_TITLE}</p>
                  </div>
                  <Navigation mobile />
                </SheetContent>
              </Sheet>

              <div>
                <p className="text-xs font-mono text-muted-foreground">{ORG_LABEL}</p>
                <p className="font-medium">{orgName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-sm font-medium">
                {initials}
              </div>

              <Button
                className="rounded-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
                size="sm"
                variant="outline"
              >
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}