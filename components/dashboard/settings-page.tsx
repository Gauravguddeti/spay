"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AlertPreferences = { days30: boolean; days7: boolean; days1: boolean }
type OrgData = {
  id?: string
  name: string
  whatsappNumber?: string | null
  alertPreferences: AlertPreferences | null
}

const DEFAULT_PREFS: AlertPreferences = { days30: true, days7: true, days1: false }

export function SettingsPageClient() {
  const { data: sessionData } = authClient.useSession()
  const session = sessionData?.user

  // ── Profile state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // ── Organization state ─────────────────────────────────────────────────────
  const [orgName, setOrgName] = useState("")
  const [orgId, setOrgId] = useState("")
  const [savingOrg, setSavingOrg] = useState(false)

  // ── Notifications state ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_PREFS)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [savingNotifs, setSavingNotifs] = useState(false)

  // ── Danger zone state ──────────────────────────────────────────────────────
  const [deletingSubscriptions, setDeletingSubscriptions] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    setDisplayName(session?.name ?? "")
  }, [session])

  useEffect(() => {
    void fetch("/api/organizations")
      .then((r) => r.json() as Promise<{ organization?: OrgData }>)
      .then(({ organization }) => {
        if (organization) {
          setOrgName(organization.name ?? "")
          setOrgId(organization.id ?? "")
          setWhatsappNumber(organization.whatsappNumber ?? "")
          setPrefs(organization.alertPreferences ?? DEFAULT_PREFS)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Profile handlers ───────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!displayName.trim()) { toast.error("Name cannot be empty"); return }
    setSavingName(true)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_name", name: displayName.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return }
      toast.success("Name updated!")
    } finally { setSavingName(false) }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) { toast.error("All password fields required"); return }
    if (newPassword !== confirmPassword) { toast.error("New passwords don't match"); return }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return }

    setSavingPassword(true)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_password", currentPassword, newPassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed to update password"); return }
      toast.success("Password updated!")
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
    } finally { setSavingPassword(false) }
  }

  // ── Org handler ────────────────────────────────────────────────────────────
  async function handleSaveOrg() {
    if (!orgName.trim()) { toast.error("Organization name cannot be empty"); return }
    setSavingOrg(true)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return }
      toast.success("Organization updated!")
    } finally { setSavingOrg(false) }
  }

  // ── Notification handler ───────────────────────────────────────────────────
  async function handleSaveNotifs() {
    const normalizedWhatsappNumber = whatsappNumber.replace(/\s+/g, "").trim()

    setSavingNotifs(true)
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertPreferences: prefs,
          whatsappNumber: normalizedWhatsappNumber || null,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return }
      toast.success("Notification settings saved!")
    } finally { setSavingNotifs(false) }
  }

  // ── Danger zone handlers ───────────────────────────────────────────────────
  async function handleDeleteSubscriptions() {
    setDeletingSubscriptions(true)
    try {
      const res = await fetch("/api/organizations?action=delete_subscriptions", {
        method: "DELETE",
      })
      if (res.ok) { toast.success("All subscriptions deleted") }
      else { toast.error("Failed to delete subscriptions") }
    } finally { setDeletingSubscriptions(false) }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    try {
      const res = await fetch("/api/organizations?action=delete_account", {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Account deleted. Signing out...")
        setTimeout(() => { window.location.href = "/login" }, 1500)
      } else {
        toast.error("Failed to delete account")
      }
    } finally { setDeletingAccount(false) }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">SETTINGS</p>
        <h1 className="mt-2 font-serif text-3xl">Settings</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="rounded-none bg-secondary">
          <TabsTrigger className="rounded-none text-sm" value="profile">Profile</TabsTrigger>
          <TabsTrigger className="rounded-none text-sm" value="organization">Organization</TabsTrigger>
          <TabsTrigger className="rounded-none text-sm" value="notifications">Notifications</TabsTrigger>
          <TabsTrigger className="rounded-none text-sm" value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Profile ── */}
        <TabsContent className="mt-4 space-y-4" value="profile">
          {/* Display name */}
          <Card className="rounded-none border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Display Name</CardTitle>
              <CardDescription>Your name shown across the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Full Name</Label>
                <Input
                  className="max-w-sm"
                  id="display-name"
                  onChange={(e) => setDisplayName(e.target.value)}
                  value={displayName}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  className="max-w-sm"
                  disabled
                  readOnly
                  value={session?.email ?? ""}
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button
                className="rounded-none"
                disabled={savingName}
                onClick={handleSaveName}
              >
                {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {savingName ? "Saving..." : "Save Name"}
              </Button>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card className="rounded-none border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Use at least 8 characters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  className="max-w-sm"
                  id="current-password"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  value={currentPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative max-w-sm">
                  <Input
                    id="new-password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                  />
                  <button
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowNewPassword((p) => !p)}
                    type="button"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  className="max-w-sm"
                  id="confirm-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </div>
              <Button
                className="rounded-none"
                disabled={savingPassword}
                onClick={handleChangePassword}
              >
                {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Organization ── */}
        <TabsContent className="mt-4" value="organization">
          <Card className="rounded-none border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Organization</CardTitle>
              <CardDescription>Manage your workspace details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-10 w-48 animate-pulse rounded-none bg-muted" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      className="max-w-sm"
                      id="org-name"
                      onChange={(e) => setOrgName(e.target.value)}
                      value={orgName}
                    />
                  </div>
                  {orgId && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Organization ID</Label>
                      <Input
                        className="max-w-sm font-mono text-xs"
                        disabled
                        readOnly
                        value={orgId}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for future team invite features
                      </p>
                    </div>
                  )}
                  <Button
                    className="rounded-none"
                    disabled={savingOrg}
                    onClick={handleSaveOrg}
                  >
                    {savingOrg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {savingOrg ? "Saving..." : "Save Organization"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Notifications ── */}
        <TabsContent className="mt-4" value="notifications">
          <Card className="rounded-none border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>
                Manage renewal reminder preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-64 animate-pulse rounded-none bg-muted" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="notifications-whatsapp-number">WhatsApp number for renewal alerts</Label>
                    <Input
                      className="max-w-sm"
                      id="notifications-whatsapp-number"
                      onChange={(event) => setWhatsappNumber(event.target.value)}
                      placeholder="+91 98765 43210"
                      value={whatsappNumber}
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send you a WhatsApp message before subscriptions renew
                    </p>
                    {whatsappNumber.trim() ? (
                      <p className="text-xs text-muted-foreground">
                        Current saved number: {whatsappNumber}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">
                        Without a WhatsApp number, renewal alerts won&apos;t be delivered
                      </p>
                    )}
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
                        <Label
                          className="cursor-pointer text-sm font-normal"
                          htmlFor={`toggle-${key}`}
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="rounded-none"
                    disabled={savingNotifs}
                    onClick={handleSaveNotifs}
                  >
                    {savingNotifs ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {savingNotifs ? "Saving..." : "Save Settings"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: Danger Zone ── */}
        <TabsContent className="mt-4 space-y-4" value="danger">
          {/* Delete all subscriptions */}
          <Card className="rounded-none border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Delete All Subscriptions</CardTitle>
              <CardDescription>
                Permanently removes every subscription from your organization. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="rounded-none"
                    disabled={deletingSubscriptions}
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingSubscriptions ? "Deleting..." : "Delete All Subscriptions"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-none border-border/70 bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all subscriptions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all subscription data from your organization.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void handleDeleteSubscriptions()}
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Delete account */}
          <Card className="rounded-none border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Delete Account</CardTitle>
              <CardDescription>
                Permanently deletes your account, organization, and all associated data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="rounded-none"
                    disabled={deletingAccount}
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingAccount ? "Deleting..." : "Delete Account"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-none border-border/70 bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes your account, organization, all subscriptions, and
                      all data. This action is irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void handleDeleteAccount()}
                    >
                      Yes, Delete My Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
