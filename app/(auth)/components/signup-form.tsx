"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth/client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SignupPayload = {
  name: string
  email: string
  password: string
  organizationName: string
}

type AuthErrorLike = {
  code?: string
  message?: string
  status?: number
}

type PendingVerification = {
  email: string
  password: string
  organizationName: string
}

const PENDING_ONBOARDING_KEY = "spay.pending-onboarding"
const OTP_RESEND_COOLDOWN_MS = 45_000

export function SignupForm() {
  const router = useRouter()
  const [payload, setPayload] = useState<SignupPayload>({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  })
  const [verificationOtp, setVerificationOtp] = useState("")
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null)
  const [lastOtpSentAt, setLastOtpSentAt] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function updateField<K extends keyof SignupPayload>(key: K, value: SignupPayload[K]) {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  function normalizeEmail(value: string) {
    return value.trim().toLowerCase()
  }

  function normalizeAuthError(error: unknown): AuthErrorLike {
    if (!error) {
      return { message: "Something went wrong" }
    }

    if (error instanceof Error) {
      return { message: error.message }
    }

    if (typeof error === "object") {
      const maybe = error as {
        code?: unknown
        message?: unknown
        status?: unknown
        statusCode?: unknown
      }

      const status =
        typeof maybe.status === "number"
          ? maybe.status
          : typeof maybe.statusCode === "number"
            ? maybe.statusCode
            : undefined

      return {
        code: typeof maybe.code === "string" ? maybe.code : undefined,
        message: typeof maybe.message === "string" ? maybe.message : "Something went wrong",
        status,
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
    const status = maybe?.status

    if (code.includes("email_not_verified") || code.includes("verify") || code.includes("forbidden")) {
      return true
    }

    if (message.includes("email not verified") || (message.includes("verify") && message.includes("email"))) {
      return true
    }

    return status === 403
  }

  function isAccountAlreadyExistsError(authError: unknown) {
    const maybe = authError as AuthErrorLike | null
    const code = maybe?.code?.toLowerCase() ?? ""
    const message = maybe?.message?.toLowerCase() ?? ""

    return (
      code.includes("already") ||
      code.includes("exists") ||
      code.includes("duplicate") ||
      code.includes("user_exists") ||
      message.includes("already") ||
      message.includes("exists") ||
      message.includes("duplicate")
    )
  }

  async function saveOrganizationSetup(organizationName: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const setupResponse = await fetch("/api/organizations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: organizationName,
        }),
      })

      if (setupResponse.ok) {
        return { ok: true as const, status: 200 }
      }

      if (setupResponse.status === 401 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 700))
        continue
      }

      return { ok: false as const, status: setupResponse.status }
    }

    return { ok: false as const, status: 500 }
  }

  async function completeOnboardingAfterSignup(organizationName: string) {
    const setupResult = await saveOrganizationSetup(organizationName)
    if (setupResult.ok) {
      localStorage.removeItem(PENDING_ONBOARDING_KEY)
    }
    return setupResult
  }

  async function beginVerificationWithoutResend(targetEmail: string) {
    const normalizedEmail = normalizeEmail(targetEmail)
    if (!normalizedEmail) {
      setError("Enter your email first")
      return
    }

    // Neon signup already sends one verification OTP. Avoid sending a duplicate here.
    setRequiresEmailVerification(true)
    setLastOtpSentAt(Date.now())
    setError("Account created. Enter the verification code from the email we just sent.")
  }

  async function beginEmailVerificationFlow(targetEmail: string, options?: { forceSend?: boolean }) {
    const normalizedEmail = normalizeEmail(targetEmail)
    if (!normalizedEmail) {
      setError("Enter your email first")
      return
    }

    const now = Date.now()
    const elapsed = now - lastOtpSentAt
    const isCoolingDown = lastOtpSentAt > 0 && elapsed < OTP_RESEND_COOLDOWN_MS

    setRequiresEmailVerification(true)

    if (isCoolingDown && !options?.forceSend) {
      const waitSeconds = Math.max(1, Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000))
      setError(`Enter the code from your inbox, or resend in ${waitSeconds}s.`)
      return
    }

    const { error: sendOtpError } = await safeAuthCall(() =>
      authClient.emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: "email-verification",
      }),
    )

    if (sendOtpError) {
      setError(sendOtpError.message ?? "Could not send verification code")
      return
    }

    setLastOtpSentAt(now)
    setError("Account created. Enter the verification code we sent to your email.")
  }

  async function handleVerifyEmail() {
    if (!pendingVerification) {
      setError("Please create your account first")
      return
    }

    const normalizedOtp = verificationOtp.trim()
    if (!normalizedOtp) {
      setError("Enter the verification code")
      return
    }

    setIsLoading(true)

    const { error: verifyError } = await safeAuthCall(() =>
      authClient.emailOtp.verifyEmail({
        email: pendingVerification.email,
        otp: normalizedOtp,
      }),
    )

    if (verifyError) {
      setIsLoading(false)
      setError(verifyError.message ?? "Invalid verification code")
      return
    }

    let signInAfterVerifyError: AuthErrorLike | null = null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await safeAuthCall(() =>
        authClient.signIn.email({
          email: pendingVerification.email,
          password: pendingVerification.password,
        }),
      )
      signInAfterVerifyError = error

      if (!signInAfterVerifyError) {
        break
      }

      if (!isEmailNotVerifiedError(signInAfterVerifyError)) {
        break
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
    }

    if (signInAfterVerifyError) {
      setIsLoading(false)

      if (isEmailNotVerifiedError(signInAfterVerifyError)) {
        setError("Code accepted, but verification is still syncing. Wait a few seconds and click Verify Email once.")
        return
      }

      setError(signInAfterVerifyError.message ?? "Email verified. Please sign in.")
      return
    }

    await completeOnboardingAfterSignup(pendingVerification.organizationName)

    setRequiresEmailVerification(false)
    setPendingVerification(null)
    setVerificationOtp("")
    setIsLoading(false)
    router.push("/dashboard")
    router.refresh()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    if (requiresEmailVerification && pendingVerification) {
      setIsLoading(false)
      setError("Enter the verification code and click Verify Email")
      return
    }

    const normalizedEmail = normalizeEmail(payload.email)
    const normalizedOrganizationName = payload.organizationName.trim()

    const { error: signUpError } = await safeAuthCall(() =>
      authClient.signUp.email({
        email: normalizedEmail,
        name: payload.name,
        password: payload.password,
        callbackURL: "/dashboard",
      }),
    )

    if (signUpError) {
      setIsLoading(false)

      if (isAccountAlreadyExistsError(signUpError)) {
        setError("An account with this email already exists. Sign in and verify email there if needed.")
        return
      }

      setError(signUpError.message ?? "Could not create account")
      return
    }

    const pending = {
      email: normalizedEmail,
      password: payload.password,
      organizationName: normalizedOrganizationName,
    }

    localStorage.setItem(
      PENDING_ONBOARDING_KEY,
      JSON.stringify({
        email: pending.email,
        organizationName: pending.organizationName,
      }),
    )

    const onboardingResult = await completeOnboardingAfterSignup(normalizedOrganizationName)

    if (onboardingResult.ok) {
      setIsLoading(false)
      router.push("/dashboard")
      router.refresh()
      return
    }

    // Neon can require email verification before creating a logged-in session.
    // Persist onboarding intent in case user leaves before completing OTP verification.
    if (onboardingResult.status === 401) {
      setPendingVerification(pending)
      await beginVerificationWithoutResend(pending.email)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setError("Account created but onboarding setup failed. Please sign in and try again.")
  }

  const accountPendingVerification = requiresEmailVerification && !!pendingVerification

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          disabled={isLoading || accountPendingVerification}
          required
          minLength={2}
          value={payload.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Aarav Malhotra"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          disabled={isLoading || accountPendingVerification}
          required
          minLength={2}
          value={payload.organizationName}
          onChange={(event) => updateField("organizationName", event.target.value)}
          placeholder="Acme Labs Pvt Ltd"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work Email</Label>
        <Input
          id="email"
          name="email"
          disabled={isLoading || accountPendingVerification}
          type="email"
          autoComplete="email"
          required
          value={payload.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="founder@acmelabs.in"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          disabled={isLoading || accountPendingVerification}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={payload.password}
          onChange={(event) => updateField("password", event.target.value)}
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
              onClick={handleVerifyEmail}
              type="button"
              variant="secondary"
            >
              Verify Email
            </Button>
            <Button
              className="flex-1 rounded-none"
              disabled={isLoading}
              onClick={() => beginEmailVerificationFlow(payload.email, { forceSend: true })}
              type="button"
              variant="outline"
            >
              Resend Code
            </Button>
          </div>
        </div>
      ) : null}

      <Button className="w-full rounded-none" disabled={isLoading} type="submit">
        {isLoading ? "Creating account..." : requiresEmailVerification ? "Awaiting verification..." : "Create SPAY Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  )
}