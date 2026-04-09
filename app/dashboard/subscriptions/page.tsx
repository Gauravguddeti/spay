import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { SubscriptionsTable } from "@/components/subscriptions/subscriptions-table"
import { getSubscriptionsByOrg } from "@/lib/db/queries/subscriptions"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

export default async function SubscriptionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const organization = await getOrganizationByOwnerId(session.user.id)

  if (!organization) {
    redirect("/login")
  }

  const subscriptions = await getSubscriptionsByOrg(organization.id)

  return <SubscriptionsTable subscriptions={subscriptions} />
}