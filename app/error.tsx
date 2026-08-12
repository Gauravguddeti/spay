"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service if missing Sentry
    console.error("Unhandled frontend exception:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0e0e0e] text-white">
      <div className="mx-auto flex max-w-[500px] flex-col items-center justify-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. The technical details have been logged to the console.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
