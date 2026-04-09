"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type AlertPreferences = {
  days30: boolean
  days7: boolean
  days1: boolean
}

type OrgSettings = {
  whatsappNumber: string | null
  alertPreferences: AlertPreferences | null
}

const DEFAULT_PREFS: AlertPreferences = { days30: true, days7: true, days1: false }

export function SettingsPageClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_PREFS)

  useEffect(() => {
    void fetch("/api/organizations")
      .then((r) => r.json() as Promise<{ organization?: OrgSettings }>)
      .then(({ organization }) => {
        if (organization) {
          setWhatsappNumber(organization.whatsappNumber ?? "")
          setPrefs(organization.alertPreferences ?? DEFAULT_PREFS)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumber.trim() || null,
          alertPreferences: prefs,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Failed to save settings")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">SETTINGS</p>
        <h1 className="mt-2 font-serif text-3xl">Settings</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="rounded-3xl border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Notifications</CardTitle>
            <CardDescription className="text-sm">
              Receive WhatsApp alerts before your subscriptions renew.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
              <Input
                className="max-w-xs"
                id="whatsapp-number"
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+919876543210"
                type="tel"
                value={whatsappNumber}
              />
              <p className="text-xs text-muted-foreground">
                Enter your number in international format (e.g. +91 for India).
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Alert me before renewal:</p>

              {(
                [
                  { key: "days30", label: "30 days before" },
                  { key: "days7", label: "7 days before" },
                  { key: "days1", label: "1 day before" },
                ] as const
              ).map(({ key, label }) => (
                <div className="flex items-center gap-3" key={key}>
                  <Switch
                    checked={prefs[key]}
                    id={`toggle-${key}`}
                    onCheckedChange={(checked) =>
                      setPrefs((p) => ({ ...p, [key]: checked }))
                    }
                  />
                  <Label className="cursor-pointer text-sm font-normal" htmlFor={`toggle-${key}`}>
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Settings saved</p>}

            <Button className="rounded-full" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
