import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { organizations } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

const BodySchema = z.object({
  organizationName: z.string().min(2).max(120).optional(),
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

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const org = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
    if (!org) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)

    await db
      .update(organizations)
      .set({
        onboardingCompleted: true,
        ...(parsed.success && parsed.data.organizationName
          ? { name: parsed.data.organizationName.trim() }
          : {}),
        ...(parsed.success && parsed.data.whatsappNumber !== undefined
          ? { whatsappNumber: parsed.data.whatsappNumber }
          : {}),
        ...(parsed.success && parsed.data.alertPreferences !== undefined
          ? { alertPreferences: parsed.data.alertPreferences }
          : {}),
      })
      .where(eq(organizations.id, org.id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
