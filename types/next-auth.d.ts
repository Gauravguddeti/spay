import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      orgId: string | null
      // Google OAuth tokens for Gmail API access
      accessToken: string | null
      refreshToken: string | null
      accessTokenExpiresAt: number | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    sub?: string
    orgId?: string | null
    accessToken?: string
    refreshToken?: string
    accessTokenExpiresAt?: number
  }
}