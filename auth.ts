import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

import { getOrganizationByOwnerId, getUserByEmail, getUserById } from "@/lib/db/queries/users"
import { organizations, users } from "@/lib/db/schema"
import { neonAuth } from "@/lib/auth/server"

type CompatSession = {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    orgId: string | null
  }
}

async function ensureAppUserAndOrg(authUser: {
  id: string
  email: string
  name?: string | null
  image?: string | null
}) {
  // Resolve by Neon user id first to avoid duplicate PK inserts when email changes.
  let user = await getUserById(authUser.id)
  if (!user) {
    user = await getUserByEmail(authUser.email)
  }

  if (!user) {
    try {
      const [createdUser] = await db
        .insert(users)
        .values({
          id: authUser.id,
          email: authUser.email,
          name: authUser.name ?? "SPAY User",
          image: authUser.image ?? null,
        })
        .returning()
      user = createdUser
    } catch (error) {
      const recovered = (await getUserById(authUser.id)) ?? (await getUserByEmail(authUser.email))
      if (!recovered) {
        throw error
      }
      user = recovered
    }
  }

  if (user.email !== authUser.email) {
    const emailOwner = await getUserByEmail(authUser.email)
    if (!emailOwner || emailOwner.id === user.id) {
      const [updatedEmail] = await db
        .update(users)
        .set({ email: authUser.email })
        .where(eq(users.id, user.id))
        .returning()
      user = updatedEmail ?? user
    } else {
      user = emailOwner
    }
  }

  if ((user.name ?? "") !== (authUser.name ?? "") || (user.image ?? null) !== (authUser.image ?? null)) {
    const [updated] = await db
      .update(users)
      .set({
        name: authUser.name ?? user.name,
        image: authUser.image ?? user.image,
      })
      .where(eq(users.id, user.id))
      .returning()
    user = updated ?? user
  }

  let organization = await getOrganizationByOwnerId(user.id)
  if (!organization) {
    const [createdOrg] = await db
      .insert(organizations)
      .values({
        ownerId: user.id,
        name: "My Organization",
      })
      .returning()
    organization = createdOrg
  }

  return { user, organization }
}

export async function auth(): Promise<CompatSession | null> {
  const { data, error } = await neonAuth.getSession()
  if (error || !data?.user) {
    return null
  }

  const { user, organization } = await ensureAppUserAndOrg({
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    image: data.user.image ?? null,
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      orgId: organization?.id ?? null,
    },
  }
}

export const handlers = neonAuth.handler()