import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { db } from "@/lib/db"
import { createUserWithOrganization, getUserByEmail } from "@/lib/db/queries/users"
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema"
import { TEMP_LOCAL_TEST_EMAIL, TEMP_LOCAL_TEST_USER_ID } from "@/lib/utils/constants"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const TEMP_LOCAL_TEST_CREDENTIALS = {
  email: TEMP_LOCAL_TEST_EMAIL,
  password: "Spendly123!",
  user: {
    id: TEMP_LOCAL_TEST_USER_ID,
    name: "Spendly Local Test",
    email: TEMP_LOCAL_TEST_EMAIL,
    image: null,
  },
} as const

// Check both NextAuth naming conventions (AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID)
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET

const hasGoogleOAuthEnv = Boolean(googleClientId && googleClientSecret)

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "dev-insecure-auth-secret-change-me"
    : undefined)

const providers: Array<ReturnType<typeof Google> | ReturnType<typeof Credentials>> = []

if (hasGoogleOAuthEnv) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          // Force refresh token to be returned on every sign-in
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  )
}

providers.push(
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

      // TEMPORARY local bypass so frontend can be tested without DB/user setup.
      if (
        parsed.data.email.toLowerCase() === TEMP_LOCAL_TEST_CREDENTIALS.email &&
        parsed.data.password === TEMP_LOCAL_TEST_CREDENTIALS.password
      ) {
        return { ...TEMP_LOCAL_TEST_CREDENTIALS.user }
      }

      // DEV-ONLY: auto-provision a test user from environment variables.
      // Set DEV_TEST_EMAIL and DEV_TEST_PASSWORD in .env.local to enable.
      if (process.env.NODE_ENV === "development") {
        const devEmail = process.env.DEV_TEST_EMAIL
        const devPassword = process.env.DEV_TEST_PASSWORD
        const devName = process.env.DEV_TEST_NAME ?? "Spendly Test User"
        const devOrgName = process.env.DEV_TEST_ORG_NAME ?? "Spendly Test Org"

        if (
          devEmail &&
          devPassword &&
          parsed.data.email.toLowerCase() === devEmail.toLowerCase() &&
          parsed.data.password === devPassword
        ) {
          let testUser = await getUserByEmail(devEmail)

          if (!testUser) {
            const passwordHash = await bcrypt.hash(devPassword, 12)
            const created = await createUserWithOrganization({
              name: devName,
              email: devEmail,
              passwordHash,
              organizationName: devOrgName,
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
)

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
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // Store user ID on first sign-in
      if (user) {
        token.sub = user.id
      }

      // Store Google OAuth tokens for Gmail API access
      if (account?.provider === "google") {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpiresAt =
          account.expires_at != null
            ? account.expires_at * 1000 // expires_at is in seconds
            : Date.now() + 3600 * 1000  // fallback: 1 hour
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      if (token.accessToken) {
        session.user.accessToken = token.accessToken as string
        session.user.refreshToken = (token.refreshToken as string) ?? null
        session.user.accessTokenExpiresAt = (token.accessTokenExpiresAt as number) ?? null
      }
      return session
    },
  },
})