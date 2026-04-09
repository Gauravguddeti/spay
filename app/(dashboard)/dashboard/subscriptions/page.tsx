import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { SubscriptionsKanban } from "@/components/dashboard/subscriptions-kanban"
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

  return (
    <div className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <h1 className="font-serif text-3xl">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop to update status
        </p>
      </div>
      <SubscriptionsKanban subscriptions={subscriptions} />
    </div>
  )
}