import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { runMatcherForOrg } from "@/lib/reconciliation/matcher"

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

    const stats = await runMatcherForOrg(org.id)

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("[reconciliation/run]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
