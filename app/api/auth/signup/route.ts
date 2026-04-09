import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { createUserWithOrganization, getUserByEmail } from "@/lib/db/queries/users"

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = signUpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid signup payload" },
        { status: 400 },
      )
    }

    const existingUser = await getUserByEmail(parsed.data.email)
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    await createUserWithOrganization({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      organizationName: parsed.data.organizationName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Signup route error", error)
    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 },
    )
  }
}