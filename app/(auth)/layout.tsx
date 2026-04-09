import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-md rounded-none border border-border/70 bg-card p-8 shadow-sm">
        {children}
      </div>
    </main>
  )
}