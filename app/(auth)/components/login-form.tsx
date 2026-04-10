"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth/client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PENDING_ONBOARDING_KEY = "spay.pending-onboarding"

type AuthErrorLike = {
  code?: string
  message?: string
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verificationOtp, setVerificationOtp] = useState("")
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefillEmail = params.get("email")
    const onboardingPending = params.get("onboarding")

    if (prefillEmail) {
      setEmail(prefillEmail)
    }

    if (onboardingPending === "pending") {
      setError("Account created. Please sign in once to finish onboarding setup.")
    }
  }, [])

  async function tryCompletePendingOnboarding(currentEmail: string) {
    const raw = localStorage.getItem(PENDING_ONBOARDING_KEY)
    if (!raw) {
      return
    }

    try {
      const pending = JSON.parse(raw) as { email?: string; organizationName?: string }
      const pendingEmail = pending.email?.trim().toLowerCase()
      const normalizedCurrentEmail = currentEmail.trim().toLowerCase()
      const organizationName = pending.organizationName?.trim()

      if (!pendingEmail || pendingEmail !== normalizedCurrentEmail || !organizationName) {
        return
      }

      const bootstrapResponse = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationName }),
      })

      if (bootstrapResponse.ok) {
        localStorage.removeItem(PENDING_ONBOARDING_KEY)
      }
    } catch {
      // Ignore malformed localStorage payloads; regular login should continue.
    }
  }

  function normalizeAuthError(error: unknown): AuthErrorLike {
    if (!error) {
      return { message: "Something went wrong" }
    }

    if (error instanceof Error) {
      return { message: error.message }
    }

    if (typeof error === "object") {
      const maybe = error as { code?: unknown; message?: unknown }
      return {
        code: typeof maybe.code === "string" ? maybe.code : undefined,
        message: typeof maybe.message === "string" ? maybe.message : "Something went wrong",
      }
    }

    if (typeof error === "string") {
      return { message: error }
    }

    return { message: "Something went wrong" }
  }

  async function safeAuthCall<T extends { error?: AuthErrorLike | null }>(
    action: () => Promise<T>,
  ): Promise<{ result: T | null; error: AuthErrorLike | null }> {
    try {
      const result = await action()
      return {
        result,
        error: result?.error ?? null,
      }
    } catch (error) {
      return {
        result: null,
        error: normalizeAuthError(error),
      }
    }
  }

  function isEmailNotVerifiedError(authError: unknown) {
    const maybe = authError as AuthErrorLike | null
    const code = maybe?.code?.toLowerCase() ?? ""
    const message = maybe?.message?.toLowerCase() ?? ""

    return code.includes("email_not_verified") || message.includes("email not verified")
  }

  async function beginEmailVerificationFlow(targetEmail: string) {
    const { error: sendOtpError } = await safeAuthCall(() =>
      authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: "email-verification",
      }),
    )

    setRequiresEmailVerification(true)

    if (sendOtpError) {
      setError(sendOtpError.message ?? "Email is not verified. Could not send verification code.")
      return
    }

    setError("Email is not verified. We sent a verification code to your inbox.")
  }

  async function handleVerifyEmailOtp() {
    if (!email || !verificationOtp) {
      setError("Enter email and verification code")
      return
    }

    setIsLoading(true)
    const { error: verifyError } = await safeAuthCall(() =>
      authClient.emailOtp.verifyEmail({
        email,
        otp: verificationOtp,
      }),
    )

    if (verifyError) {
      setIsLoading(false)
      setError(verifyError.message ?? "Invalid verification code")
      return
    }

    const { error: signInAfterVerifyError } = await safeAuthCall(() => authClient.signIn.email({ email, password }))
    if (signInAfterVerifyError) {
      setIsLoading(false)
      setError(signInAfterVerifyError.message ?? "Email verified. Please sign in again.")
      return
    }

    await tryCompletePendingOnboarding(email)
    setRequiresEmailVerification(false)
    setVerificationOtp("")
    setIsLoading(false)
    router.push("/dashboard")
    router.refresh()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: signInError } = await safeAuthCall(() =>
      authClient.signIn.email({
        email,
        password,
      }),
    )

    if (!signInError) {
      await tryCompletePendingOnboarding(email)
      setIsLoading(false)
      router.push("/dashboard")
      router.refresh()
      return
    }

    if (isEmailNotVerifiedError(signInError)) {
      await beginEmailVerificationFlow(email)
      setIsLoading(false)
      return
    }

    // Fallback path: migrate legacy bcrypt users into Neon Auth on first login.
    const legacyResponse = await fetch("/api/auth/legacy-verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!legacyResponse.ok) {
      setIsLoading(false)
      if (legacyResponse.status === 429) {
        setError("Too many attempts. Please wait and try again.")
        return
      }

      setError(signInError.message ?? "Incorrect email or password")
      return
    }

    const legacyData = (await legacyResponse.json()) as { valid?: boolean; name?: string }
    if (!legacyData.valid) {
      setIsLoading(false)
      setError(signInError.message ?? "Incorrect email or password")
      return
    }

    const { error: migrationError } = await safeAuthCall(() =>
      authClient.signUp.email({
        email,
        password,
        name: legacyData.name ?? "SPAY User",
        callbackURL: "/dashboard",
      }),
    )

    if (migrationError) {
      const { error: retryError } = await safeAuthCall(() => authClient.signIn.email({ email, password }))
      setIsLoading(false)

      if (retryError) {
        if (isEmailNotVerifiedError(retryError)) {
          await beginEmailVerificationFlow(email)
          return
        }

        setError(retryError.message ?? "Account migration failed. Please use Sign up once, then login.")
        return
      }

      await tryCompletePendingOnboarding(email)
      router.push("/dashboard")
      router.refresh()
      return
    }

    const { error: signInAfterMigrationError } = await safeAuthCall(() => authClient.signIn.email({ email, password }))
    if (signInAfterMigrationError) {
      setIsLoading(false)

      if (isEmailNotVerifiedError(signInAfterMigrationError)) {
        await beginEmailVerificationFlow(email)
        return
      }

      setError(signInAfterMigrationError.message ?? "Account created but sign in failed. Please login again.")
      return
    }

    await tryCompletePendingOnboarding(email)
    setIsLoading(false)
    router.push("/dashboard")
    router.refresh()
  }

  async function handleGoogleSignIn() {
    setError(null)
    setIsLoading(true)

    const { error: socialError } = await safeAuthCall(() =>
      authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" }),
    )

    if (socialError) {
      setIsLoading(false)
      setError(socialError.message ?? "Google sign in failed")
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="founder@startup.in"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      {requiresEmailVerification ? (
        <div className="space-y-2">
          <Label htmlFor="verificationOtp">Email Verification Code</Label>
          <Input
            id="verificationOtp"
            name="verificationOtp"
            inputMode="numeric"
            required
            value={verificationOtp}
            onChange={(event) => setVerificationOtp(event.target.value)}
            placeholder="Enter OTP from your email"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-none"
              disabled={isLoading}
              onClick={handleVerifyEmailOtp}
              type="button"
              variant="secondary"
            >
              Verify Email
            </Button>
            <Button
              className="flex-1 rounded-none"
              disabled={isLoading}
              onClick={() => beginEmailVerificationFlow(email)}
              type="button"
              variant="outline"
            >
              Resend Code
            </Button>
          </div>
        </div>
      ) : null}

      <Button className="w-full rounded-none" disabled={isLoading} type="submit">
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>

      <Button
        className="w-full rounded-none"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        type="button"
        variant="outline"
      >
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to SPAY?{" "}
        <Link className="font-medium text-primary hover:underline" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  )
}