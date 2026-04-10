import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { organizations } from "@/lib/db/schema"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await getOrganizationByOwnerId(session.user.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    await db
      .update(organizations)
      .set({ onboardingCompleted: true })
      .where(eq(organizations.id, org.id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
