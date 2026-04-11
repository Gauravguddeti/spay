"use client"

import Link from "next/link"
import { useState } from "react"
import { authClient } from "@/lib/auth/client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthErrorLike = {
  code?: string
  message?: string
  status?: number
}

const OTP_RESEND_COOLDOWN_MS = 45_000

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long"
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter"
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number"
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character"
  }
  return null
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [hasRequestedOtp, setHasRequestedOtp] = useState(false)
  const [lastOtpSentAt, setLastOtpSentAt] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isResetComplete, setIsResetComplete] = useState(false)

  async function sendResetOtp(options?: { forceSend?: boolean }) {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError("Enter your email first")
      return
    }

    const now = Date.now()
    const elapsed = now - lastOtpSentAt
    const isCoolingDown = lastOtpSentAt > 0 && elapsed < OTP_RESEND_COOLDOWN_MS

    if (isCoolingDown && !options?.forceSend) {
      const waitSeconds = Math.max(1, Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000))
      setError(`Please wait ${waitSeconds}s before requesting another code.`)
      return
    }

    setError(null)
    setInfo(null)
    setIsLoading(true)

    const { error: requestError } = await safeAuthCall(() =>
      authClient.forgetPassword.emailOtp({
        email: normalizedEmail,
      }),
    )

    setIsLoading(false)

    if (requestError) {
      setError(requestError.message ?? "Could not send reset code")
      return
    }

    setHasRequestedOtp(true)
    setLastOtpSentAt(now)
    setInfo("If this email exists, we sent a reset code to your inbox.")
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = normalizeEmail(email)
    const normalizedOtp = otp.trim()

    if (!normalizedEmail) {
      setError("Enter your email")
      return
    }
    if (!normalizedOtp) {
      setError("Enter the reset code")
      return
    }
    if (!newPassword) {
      setError("Enter your new password")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setError(null)
    setInfo(null)
    setIsLoading(true)

    const { error: resetError } = await safeAuthCall(() =>
      authClient.emailOtp.resetPassword({
        email: normalizedEmail,
        otp: normalizedOtp,
        password: newPassword,
      }),
    )

    setIsLoading(false)

    if (resetError) {
      setError(resetError.message ?? "Could not reset password")
      return
    }

    setIsResetComplete(true)
  }

  if (isResetComplete) {
    return (
      <div className="space-y-4">
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
          <AlertDescription>
            Password reset successful. You can now sign in with your new password.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full rounded-none">
          <Link href={`/login?email=${encodeURIComponent(normalizeEmail(email))}`}>
            Back To Sign In
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleResetPassword}>
      {error ? (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {info ? (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading || hasRequestedOtp}
          required
          placeholder="founder@acmelabs.in"
        />
      </div>

      {!hasRequestedOtp ? (
        <Button
          className="w-full rounded-none"
          disabled={isLoading}
          onClick={() => {
            void sendResetOtp()
          }}
          type="button"
        >
          {isLoading ? "Sending code..." : "Send Reset Code"}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otp">Reset Code</Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="Enter OTP from your email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 chars, 1 uppercase, 1 number, 1 symbol"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Rewrite new password"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 rounded-none" disabled={isLoading} type="submit">
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
            <Button
              className="flex-1 rounded-none"
              disabled={isLoading}
              onClick={() => {
                void sendResetOtp({ forceSend: true })
              }}
              type="button"
              variant="outline"
            >
              Resend Code
            </Button>
          </div>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link className="font-medium text-primary hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  )
}
