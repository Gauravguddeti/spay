import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { SettingsPageClient } from "@/components/dashboard/settings-page"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { DEV_TEST_USER_ID } from "@/lib/utils/constants"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const isTempLocalUser =
    process.env.NODE_ENV === "development" &&
    DEV_TEST_USER_ID !== null &&
    session.user.id === DEV_TEST_USER_ID

  const organization = isTempLocalUser
    ? {
        id: "local-demo-org",
        name: "Demo Organization",
        whatsappNumber: null,
        alertPreferences: { days30: true, days7: true, days1: false },
      }
    : session.user.orgId
      ? await getOrganizationByOwnerId(session.user.id, session.user.orgId)
      : null

  if (!organization) {
    redirect("/dashboard")
  }

  return (
    <SettingsPageClient
      initialData={{
        id: organization.id,
        name: organization.name,
        whatsappNumber: organization.whatsappNumber,
        alertPreferences: (organization.alertPreferences as {
          days30: boolean
          days7: boolean
          days1: boolean
        } | null) ?? null,
      }}
    />
  )
}