"use client"

import type React from "react"
import { LogOut, Menu } from "lucide-react"

import { authClient } from "@/lib/auth/client"
import { ORG_LABEL } from "@/lib/utils/constants"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type ShellClientProps = {
  orgName: string
  userName: string
  userEmail: string
  mobileSidebar: React.ReactNode
}

export function ShellClient({
  orgName,
  userName,
  userEmail,
  mobileSidebar,
}: ShellClientProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex items-center justify-between rounded-none border border-border/70 bg-card px-4 py-3 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="md:hidden rounded-none" size="icon" variant="outline">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-70 rounded-none border-l-border/70 bg-card" side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Navigate between dashboard sections.</SheetDescription>
            </SheetHeader>
            {mobileSidebar}
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

        <div className="flex h-10 w-10 items-center justify-center rounded-none border border-border bg-secondary text-sm font-medium">
          {initials}
        </div>

        <Button
          className="rounded-none"
          onClick={async () => {
            await authClient.signOut()
            window.location.href = "/login"
          }}
          size="sm"
          variant="outline"
        >
          <LogOut className="mr-1 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
