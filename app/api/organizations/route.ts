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
  updateOrganizationName,
} from "@/lib/db/queries/users"
import { TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

const DEFAULT_ALERT_PREFERENCES = { days30: true, days7: true, days1: false }

function buildLocalDemoOrganization(overrides?: {
  name?: string
  whatsappNumber?: string | null
  alertPreferences?: { days30: boolean; days7: boolean; days1: boolean } | null
}) {
  return {
    id: "local-demo-org",
    name: overrides?.name ?? "Demo Organization",
    whatsappNumber: overrides?.whatsappNumber ?? null,
    alertPreferences: overrides?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
  }
}

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format, e.g. +919876543210")
    .optional()
    .nullable(),
  alertPreferences: z
    .object({ days30: z.boolean(), days7: z.boolean(), days1: z.boolean() })
    .optional()
    .nullable(),
})

/** GET /api/organizations */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.id === TEMP_LOCAL_TEST_USER_ID) {
    return NextResponse.json({ organization: buildLocalDemoOrganization() })
  }

  const organization = await getOrganizationByOwnerId(session.user.id)
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ organization })
}

/** PATCH /api/organizations — update name, whatsapp, alert prefs */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isTempLocalUser = session.user.id === TEMP_LOCAL_TEST_USER_ID
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
        whatsappNumber: parsed.data.whatsappNumber,
        alertPreferences: parsed.data.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
      }),
    })
  }

  const organization = await getOrganizationByOwnerId(session.user.id)
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.whatsappNumber !== undefined) updateData.whatsappNumber = parsed.data.whatsappNumber
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

  if (session.user.id === TEMP_LOCAL_TEST_USER_ID) {
    return NextResponse.json({ success: true })
  }

  const organization = await getOrganizationByOwnerId(session.user.id)
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (action === "delete_subscriptions") {
    await deleteAllSubscriptionsByOrg(organization.id)
    return NextResponse.json({ success: true })
  }

  if (action === "delete_account") {
    await deleteUserAccount(session.user.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
