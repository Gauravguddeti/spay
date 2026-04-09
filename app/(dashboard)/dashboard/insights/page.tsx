import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { InsightsPageClient } from "@/components/dashboard/insights-page"
import { getSubscriptionsByOrg } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

export default async function InsightsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID
  let subscriptions: Awaited<ReturnType<typeof getSubscriptionsByOrg>> = []

  if (!isTempLocalUser) {
    const organization = await getOrganizationByOwnerId(session.user.id)
    if (!organization) redirect("/login")
    subscriptions = await getSubscriptionsByOrg(organization.id)
  }

  // Serialise for the client component (Drizzle returns Date objects)
  const serialised = subscriptions.map((s) => ({
    ...s,
    nextRenewalDate: s.nextRenewalDate ? new Date(s.nextRenewalDate).toISOString() : null,
    lastUsedAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  }))

  return <InsightsPageClient subscriptions={serialised} />
}