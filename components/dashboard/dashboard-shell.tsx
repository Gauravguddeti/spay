import type React from "react"

import { DashboardPageTransition } from "@/components/dashboard/dashboard-page-transition"
import { ShellClient } from "@/components/dashboard/shell-client"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

type DashboardShellProps = {
  children: React.ReactNode
  orgName: string
  userName: string
  userEmail: string
}

export function DashboardShell({ children, orgName, userName, userEmail }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 overflow-hidden rounded-none border-r bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-md)] md:block motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
          <div className="pointer-events-none absolute left-0 top-0 h-44 w-full bg-[radial-gradient(circle_at_top_left,rgba(90,144,120,0.06),transparent_72%)]" />
          <div className="relative h-full">
            <SidebarNav
              userEmail={userEmail}
              userName={userName}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ShellClient
            mobileSidebar={(
              <SidebarNav
                mobile
                userEmail={userEmail}
                userName={userName}
              />
            )}
            orgName={orgName}
            userEmail={userEmail}
            userName={userName}
          />

          <main className="min-w-0">
            <DashboardPageTransition>{children}</DashboardPageTransition>
          </main>
        </div>
      </div>
    </div>
  )
}