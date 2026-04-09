import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { db } from "@/lib/db"
import { createUserWithOrganization, getUserByEmail } from "@/lib/db/queries/users"
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const HARDCODED_TEST_CREDENTIALS = {
  email: "test@spendly.local",
  password: "Spendly123!",
  name: "Spendly Test User",
  organizationName: "Spendly Test Org",
} as const

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) {
          return null
        }

        if (
          parsed.data.email.toLowerCase() === HARDCODED_TEST_CREDENTIALS.email &&
          parsed.data.password === HARDCODED_TEST_CREDENTIALS.password
        ) {
          let testUser = await getUserByEmail(HARDCODED_TEST_CREDENTIALS.email)

          if (!testUser) {
            const passwordHash = await bcrypt.hash(HARDCODED_TEST_CREDENTIALS.password, 12)
            const created = await createUserWithOrganization({
              name: HARDCODED_TEST_CREDENTIALS.name,
              email: HARDCODED_TEST_CREDENTIALS.email,
              passwordHash,
              organizationName: HARDCODED_TEST_CREDENTIALS.organizationName,
            })
            testUser = created.user
          }

          return {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            image: testUser.image,
          }
        }

        const existingUser = await getUserByEmail(parsed.data.email)
        if (!existingUser || !existingUser.password) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          parsed.data.password,
          existingUser.password,
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          image: existingUser.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})