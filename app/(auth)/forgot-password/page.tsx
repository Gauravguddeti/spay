import { ForgotPasswordForm } from "@/app/(auth)/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-mono text-muted-foreground">SPAY AUTH</p>
        <h1 className="font-serif text-3xl leading-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email, verify with OTP, and set a new password.
        </p>
      </div>

      <ForgotPasswordForm />
    </section>
  )
}
