import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { organizations, users } from "@/lib/db/schema"

export type CreateUserWithOrgInput = {
  name: string
  email: string
  passwordHash: string
  organizationName: string
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user ?? null
}

export async function getOrganizationByOwnerId(ownerId: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, ownerId))
    .limit(1)

  return organization ?? null
}

export async function createUserWithOrganization(input: CreateUserWithOrgInput) {
  const userId = crypto.randomUUID()

  const [createdUser] = await db
    .insert(users)
    .values({
      id: userId,
      name: input.name,
      email: input.email,
      password: input.passwordHash,
    })
    .returning()

  try {
    const [createdOrganization] = await db
      .insert(organizations)
      .values({
        name: input.organizationName,
        ownerId: createdUser.id,
      })
      .returning()

    return {
      user: createdUser,
      organization: createdOrganization,
    }
  } catch (error) {
    await db.delete(users).where(eq(users.id, createdUser.id))
    throw error
  }
}