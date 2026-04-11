import { and, eq } from "drizzle-orm"

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

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return user ?? null
}

export async function getOrganizationByOwnerId(ownerId: string, orgId?: string) {
  const whereClause = orgId
    ? and(eq(organizations.ownerId, ownerId), eq(organizations.id, orgId))
    : eq(organizations.ownerId, ownerId)

  const [organization] = await db
    .select()
    .from(organizations)
    .where(whereClause)
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

export async function updateUserName(userId: string, orgId: string, name: string) {
  const organization = await getOrganizationByOwnerId(userId, orgId)
  if (!organization) {
    return null
  }

  const [updated] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, userId))
    .returning()
  return updated ?? null
}

export async function updateUserPassword(userId: string, orgId: string, passwordHash: string) {
  const organization = await getOrganizationByOwnerId(userId, orgId)
  if (!organization) {
    return null
  }

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

export async function deleteAllSubscriptionsByOrg(orgId: string, ownerId: string) {
  const organization = await getOrganizationByOwnerId(ownerId, orgId)
  if (!organization) {
    return false
  }

  await db.delete(subscriptions).where(eq(subscriptions.orgId, orgId))
  return true
}

export async function deleteUserAccount(userId: string, orgId: string) {
  const organization = await getOrganizationByOwnerId(userId, orgId)
  if (!organization) {
    return false
  }

  // Cascades delete org → subscriptions → renewalAlerts via FK constraints
  await db.delete(users).where(eq(users.id, userId))
  return true
}