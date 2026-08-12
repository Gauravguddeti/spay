import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { organizations } from "@/lib/db/schema"
import {
  deleteAllSubscriptionsByOrg,
  deleteUserAccount,
  getOrganizationByOwnerId,
} from "@/lib/db/queries/users"
import { DEV_TEST_USER_ID } from "@/lib/utils/constants"

const DEFAULT_ALERT_PREFERENCES = { days30: true, days7: true, days1: false }

function buildLocalDemoOrganization(overrides?: {
  name?: string
  alertPreferences?: { days30: boolean; days7: boolean; days1: boolean } | null
}) {
  return {
    id: "local-demo-org",
    name: overrides?.name ?? "Demo Organization",
    alertPreferences: overrides?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
  }
}

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  alertPreferences: z
    .object({ days30: z.boolean(), days7: z.boolean(), days1: z.boolean() })
    .optional()
    .nullable(),
})

/** GET /api/organizations */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // DEV ONLY - this block is unreachable in production
  // Remove before public launch if no longer needed
  if (process.env.NODE_ENV === "development" && DEV_TEST_USER_ID && session.user.id === DEV_TEST_USER_ID) {
    return NextResponse.json({ organization: buildLocalDemoOrganization() })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const organization = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
  if (!organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json({ organization })
}

/** PATCH /api/organizations — update name, alert prefs */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // DEV ONLY - this block is unreachable in production
  // Remove before public launch if no longer needed
  const isTempLocalUser =
    process.env.NODE_ENV === "development" &&
    DEV_TEST_USER_ID !== null &&
    session.user.id === DEV_TEST_USER_ID
  const payload: unknown = await req.json()
  const parsed = UpdateOrgSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    )
  }

  if (isTempLocalUser) {
    return NextResponse.json({
      organization: buildLocalDemoOrganization({
        name: parsed.data.name,
        alertPreferences: parsed.data.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
      }),
    })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const organization = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
  if (!organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.alertPreferences !== undefined) updateData.alertPreferences = parsed.data.alertPreferences

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const [updated] = await db
    .update(organizations)
    .set(updateData)
    .where(eq(organizations.id, organization.id))
    .returning()

  return NextResponse.json({ organization: updated })
}

/** DELETE /api/organizations?action=delete_subscriptions|delete_account */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  // DEV ONLY - this block is unreachable in production
  // Remove before public launch if no longer needed
  if (process.env.NODE_ENV === "development" && DEV_TEST_USER_ID && session.user.id === DEV_TEST_USER_ID) {
    return NextResponse.json({ success: true })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const organization = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
  if (!organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (action === "delete_subscriptions") {
    const deleted = await deleteAllSubscriptionsByOrg(organization.id, session.user.id)
    if (!deleted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === "delete_account") {
    const deleted = await deleteUserAccount(session.user.id, organization.id)
    if (!deleted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
