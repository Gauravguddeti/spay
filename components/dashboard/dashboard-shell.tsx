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
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 rounded-none border border-border/70 bg-card p-4 shadow-sm md:block motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300">
          <SidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ShellClient
            mobileSidebar={<SidebarNav mobile />}
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