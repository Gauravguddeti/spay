import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SubscriptionsKanban } from "@/components/dashboard/subscriptions-kanban"
import { getSubscriptionsByOrg } from "@/lib/db/queries/subscriptions"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

export default async function SubscriptionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID
  const orgId = session.user.orgId

  if (!isTempLocalUser && !orgId) {
    redirect("/dashboard")
  }

  let subscriptions: Awaited<ReturnType<typeof getSubscriptionsByOrg>> = []
  if (!isTempLocalUser) {
    try {
      ;[subscriptions] = await Promise.all([getSubscriptionsByOrg(orgId as string)])
    } catch (error) {
      console.error("Failed to load subscriptions page data", {
        userId: session.user.id,
        orgId,
        error,
      })
      throw error
    }
  }

  return <SubscriptionsKanban subscriptions={subscriptions} />
}