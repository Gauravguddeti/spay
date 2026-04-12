import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { Syne, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import { NavigationProgress } from "@/components/ui/NavigationProgress"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "SPAY - Subscription Spend Control for Startup Teams",
  description:
    "Track SaaS subscriptions, monitor renewals, and reduce unnecessary software spend with one practical dashboard.",
  generator: "SPAY",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${syne.variable} ${inter.variable} font-sans antialiased`}
      >
        <Providers>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
          <Toaster richColors position="bottom-right" />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
