import { LoginForm } from "@/app/(auth)/components/login-form"

export default function LoginPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-mono text-muted-foreground">SPENDLY AUTH</p>
        <h1 className="font-serif text-3xl leading-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your startup&apos;s SaaS spend.
        </p>
      </div>

      <LoginForm />
    </section>
  )
}