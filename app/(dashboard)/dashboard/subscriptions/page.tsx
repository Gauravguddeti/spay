import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { SubscriptionsTable } from "@/components/dashboard/subscriptions-table"
import { getSubscriptionsByOrg } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

export default async function SubscriptionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID

  let subscriptions: Awaited<ReturnType<typeof getSubscriptionsByOrg>> = []
  if (!isTempLocalUser) {
    try {
      const organization = await getOrganizationByOwnerId(session.user.id)

      if (!organization) {
        redirect("/login")
      }

      subscriptions = await getSubscriptionsByOrg(organization.id)
    } catch {
      subscriptions = []
    }
  }

  return <SubscriptionsTable subscriptions={subscriptions} />
}