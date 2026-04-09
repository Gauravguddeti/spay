import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    redirect("/login")
  }

  const organization = await getOrganizationByOwnerId(session.user.id)
  if (!organization) {
    redirect("/login")
  }

  return (
    <DashboardShell
      orgName={organization.name}
      userEmail={session.user.email}
      userName={session.user.name ?? "Founder"}
    >
      {children}
    </DashboardShell>
  )
}