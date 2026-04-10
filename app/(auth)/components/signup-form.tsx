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

export function SignupForm() {
  const router = useRouter()
  const [payload, setPayload] = useState<SignupPayload>({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function updateField<K extends keyof SignupPayload>(key: K, value: SignupPayload[K]) {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const signUpResult = await authClient.signUp.email({
      email: payload.email,
      name: payload.name,
      password: payload.password,
      callbackURL: "/dashboard",
    })

    if (signUpResult.error) {
      setIsLoading(false)
      setError(signUpResult.error.message ?? "Could not create account")
      return
    }

    const bootstrapResponse = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ organizationName: payload.organizationName }),
    })

    if (!bootstrapResponse.ok) {
      setIsLoading(false)
      setError("Account created but onboarding setup failed. Please try again after login.")
      return
    }

    setIsLoading(false)
    router.push("/dashboard")
    router.refresh()
  }

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
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={payload.password}
          onChange={(event) => updateField("password", event.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <Button className="w-full rounded-none" disabled={isLoading} type="submit">
        {isLoading ? "Creating account..." : "Create SPAY Account"}
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