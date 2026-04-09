import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { organizations } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const updateOrgSchema = z.object({
  whatsappNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be a valid E.164 phone number, e.g. +919876543210").optional().nullable(),
  alertPreferences: z
    .object({
      days30: z.boolean(),
      days7: z.boolean(),
      days1: z.boolean(),
    })
    .optional()
    .nullable(),
})

/**
 * PATCH /api/organizations
 * Updates whatsappNumber and/or alertPreferences for the authenticated user's org.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organization = await getOrganizationByOwnerId(session.user.id)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const payload = await request.json()
    const parsed = updateOrgSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      )
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.whatsappNumber !== undefined) {
      updateData.whatsappNumber = parsed.data.whatsappNumber
    }
    if (parsed.data.alertPreferences !== undefined) {
      updateData.alertPreferences = parsed.data.alertPreferences
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      )
    }

    const [updated] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organization.id))
      .returning()

    return NextResponse.json({ organization: updated })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/organizations
 * Returns current org settings for the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organization = await getOrganizationByOwnerId(session.user.id)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
