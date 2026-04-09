import { SignupForm } from "@/app/(auth)/components/signup-form"

export default function SignupPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-mono text-muted-foreground">SPENDLY AUTH</p>
        <h1 className="font-serif text-3xl leading-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start tracking and optimizing every SaaS subscription in one place.
        </p>
      </div>

      <SignupForm />
    </section>
  )
}