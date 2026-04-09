import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { organizations, subscriptions, users } from "@/lib/db/schema"

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

export async function updateUserName(userId: string, name: string) {
  const [updated] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, userId))
    .returning()
  return updated ?? null
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const [updated] = await db
    .update(users)
    .set({ password: passwordHash })
    .where(eq(users.id, userId))
    .returning()
  return updated ?? null
}

export async function updateOrganizationName(orgId: string, name: string) {
  const [updated] = await db
    .update(organizations)
    .set({ name })
    .where(eq(organizations.id, orgId))
    .returning()
  return updated ?? null
}

export async function deleteAllSubscriptionsByOrg(orgId: string) {
  await db.delete(subscriptions).where(eq(subscriptions.orgId, orgId))
}

export async function deleteUserAccount(userId: string) {
  // Cascades delete org → subscriptions → renewalAlerts via FK constraints
  await db.delete(users).where(eq(users.id, userId))
}