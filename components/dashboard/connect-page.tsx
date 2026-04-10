"use client"

import { useCallback, useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, Circle, ExternalLink, Loader2, Mail, PlugZap } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatInr } from "@/lib/utils/currency"

type DetectedSubscription = {
  name: string
  vendorKey: string
  originalAmount: number
  originalCurrency: string
  amountInr: number
  billingDate: string | null
  confidence: number
}

function confidenceLabel(score: number): string {
  if (score >= 0.9) return "High"
  if (score >= 0.7) return "Medium"
  return "Low"
}

function confidenceClass(score: number): string {
  if (score >= 0.9) return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (score >= 0.7) return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-red-500/20 text-red-800 border-red-200"
}

export function ConnectPageClient({ gmailEnabled = true, initialConnected = false }: { gmailEnabled?: boolean, initialConnected?: boolean }) {
  const [isGmailConnected, setIsGmailConnected] = useState(initialConnected)

  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedSubscription[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)

  const handleScan = useCallback(async () => {
    setScanning(true)
    setScanError(null)
    try {
      const res = await fetch("/api/integrations/gmail/scan", { method: "POST" })
      const data = (await res.json()) as {
        subscriptions?: DetectedSubscription[]
        error?: string
        message?: string
      }

      if (!res.ok) {
        if (data.error === "GMAIL_AUTH_EXPIRED" || data.error === "GMAIL_NOT_CONNECTED") {
          toast.error("Your Gmail connection has expired or is missing. Please reconnect.")
          setIsGmailConnected(false)
        } else {
          toast.error(data.message ?? data.error ?? "Scan failed")
        }
        return
      }

      setDetected(data.subscriptions ?? [])
      const preSelected = new Set(
        (data.subscriptions ?? []).filter((s) => s.confidence >= 0.9).map((s) => s.vendorKey),
      )
      setSelected(preSelected)
      if ((data.subscriptions?.length ?? 0) > 0) {
        toast.success(`${data.subscriptions!.length} subscriptions detected`)
      } else {
        toast.info("No subscriptions found in your Gmail inbox")
      }
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (isGmailConnected && detected === null && !scanning) {
      void handleScan()
    }
  }, [detected, handleScan, isGmailConnected, scanning])

  function toggleVendor(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleImport() {
    if (!detected) return
    const toImport = detected.filter((s) => selected.has(s.vendorKey))
    if (toImport.length === 0) return

    setImporting(true)
    try {
      await Promise.all(
        toImport.map((sub) =>
          fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: sub.name,
              amountInr: sub.amountInr,
              billingCycle: "monthly",
              detectedVia: "gmail",
              originalAmount: sub.originalAmount,
              originalCurrency: sub.originalCurrency,
              status: "active",
              nextRenewalDate: sub.billingDate ?? null,
            }),
          }),
        ),
      )
      setImportDone(true)
      toast.success(`${toImport.length} subscriptions imported!`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">INTEGRATIONS</p>
        <h1 className="mt-2 font-serif text-3xl">Connect Gmail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Automatically detect SaaS subscriptions from your inbox
        </p>
      </div>

      <Card className="rounded-none border-border/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-none bg-red-500/20">
              <Mail className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">Gmail</CardTitle>
              <CardDescription className="text-xs">
                {!gmailEnabled
                  ? "Setup required"
                  : isGmailConnected
                    ? "Connected - read-only access"
                    : "Connect to scan receipts and invoices"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!gmailEnabled ? (
            // Google OAuth not configured — show setup instructions
            <div className="rounded-none border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">Google OAuth not configured</p>
              </div>
              <p className="text-sm text-amber-700">
                To enable Gmail scanning, add your Google OAuth credentials to{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">.env.local</code>:
              </p>
              <pre className="rounded-none bg-amber-100 p-3 text-xs font-mono text-amber-900 overflow-x-auto">{`AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret`}</pre>
              <p className="text-xs text-amber-700">
                Get credentials from the{" "}
                <a
                  className="inline-flex items-center gap-1 underline"
                  href="https://console.cloud.google.com/apis/credentials"
                  rel="noreferrer"
                  target="_blank"
                >
                  Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>
                {" "}— enable the Gmail API and create an OAuth 2.0 client ID.
              </p>
            </div>
          ) : !isGmailConnected ? (
            <Button className="rounded-none" onClick={() => signIn("google", { callbackUrl: "/dashboard/connect" })}>
              <PlugZap className="mr-2 h-4 w-4" />
              Connect Gmail
            </Button>
          ) : (
            <Button className="rounded-none" disabled={scanning} onClick={handleScan} variant="outline">
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {scanning ? "Scanning your inbox for subscriptions..." : "Re-scan inbox"}
            </Button>
          )}
        </CardContent>
      </Card>

      {scanError && (
        <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {scanError}
        </div>
      )}

      {importDone && (
        <div className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscriptions imported successfully. View them in the <a className="underline" href="/dashboard/subscriptions">Subscriptions</a> tab.
        </div>
      )}

      {detected !== null && !importDone && (
        <Card className="rounded-none border-border/70">
          <CardHeader>
            <CardTitle className="text-base">
              {detected.length === 0
                ? "No subscriptions detected"
                : `${detected.length} subscription${detected.length === 1 ? "" : "s"} detected`}
            </CardTitle>
            <CardDescription className="text-xs">
              {detected.length > 0
                ? "Select which ones to import. Billing cycle defaults to monthly - edit after import."
                : "Try reconnecting Gmail or add subscriptions manually."}
            </CardDescription>
          </CardHeader>
          {detected.length > 0 && (
            <CardContent className="space-y-3">
              {detected.map((sub) => {
                const isSelected = selected.has(sub.vendorKey)
                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-none border px-4 py-3 text-left transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border/70 hover:bg-muted/50"
                    }`}
                    key={sub.vendorKey}
                    onClick={() => toggleVendor(sub.vendorKey)}
                    type="button"
                  >
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInr(sub.amountInr, 0)}
                        {sub.originalCurrency !== "INR" && (
                          <span className="ml-1 opacity-60">({sub.originalCurrency} {sub.originalAmount})</span>
                        )}
                        {sub.billingDate && ` · Last billed ${sub.billingDate}`}
                      </p>
                    </div>
                    <Badge className={confidenceClass(sub.confidence)} variant="outline">
                      {confidenceLabel(sub.confidence)}
                    </Badge>
                  </button>
                )
              })}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {selected.size} of {detected.length} selected
                </p>
                <Button className="rounded-none" disabled={selected.size === 0 || importing} onClick={handleImport}>
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {importing ? "Importing..." : `Import ${selected.size} subscription${selected.size !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </section>
  )
}
