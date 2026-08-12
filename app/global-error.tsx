"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-[#0e0e0e] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-4 text-3xl font-bold">A critical error occurred</h2>
          <p className="mb-6 text-gray-400">
            We could not load this application. The error has been logged to the console.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
