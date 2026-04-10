import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { auth } from "@/auth"
import { getUserByEmail } from "@/lib/db/queries/users"
import { updateUserName, updateUserPassword } from "@/lib/db/queries/users"

const UpdateNameSchema = z.object({
  action: z.literal("update_name"),
  name: z.string().min(1).max(100),
})

const UpdatePasswordSchema = z.object({
  action: z.literal("update_password"),
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})

const BodySchema = z.discriminatedUnion("action", [UpdateNameSchema, UpdatePasswordSchema])

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (parsed.data.action === "update_name") {
    const updated = await updateUserName(session.user.id, session.user.orgId, parsed.data.name)
    if (!updated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ success: true })
  }

  // update_password
  const user = await getUserByEmail(session.user.email)
  if (!user?.password) {
    return NextResponse.json(
      { error: "Password authentication is not set up for this account" },
      { status: 400 },
    )
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!isValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
  const updated = await updateUserPassword(session.user.id, session.user.orgId, newHash)
  if (!updated) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
