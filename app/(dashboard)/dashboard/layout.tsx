import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { GlobalQuickAddLazy } from "@/components/dashboard/global-quick-add-lazy"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { DEV_TEST_USER_ID } from "@/lib/utils/constants"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    redirect("/login")
  }

  // DEV ONLY - this block is unreachable in production
  // Remove before public launch if no longer needed
  const isTempLocalUser =
    process.env.NODE_ENV === "development" &&
    DEV_TEST_USER_ID !== null &&
    session.user.id === DEV_TEST_USER_ID

  let organizationName = "Demo Organization"
  if (!isTempLocalUser) {
    try {
      const organization = await getOrganizationByOwnerId(session.user.id)
      if (!organization) {
        redirect("/login")
      }
      organizationName = organization.name
    } catch {
      redirect("/login")
    }
  }

  return (
    <DashboardShell
      orgName={organizationName}
      userEmail={session.user.email}
      userName={session.user.name ?? "Founder"}
    >
      <GlobalQuickAddLazy />
      {children}
    </DashboardShell>
  )
}