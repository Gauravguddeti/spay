"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, FileText, Mail, Pencil, ArrowRight, Bell, X } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

const STEPS = 3

export function OnboardingWizard({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [workspaceName, setWorkspaceName] = useState(orgName)
  const [alerts, setAlerts] = useState({ days30: true, days7: true })
  const [whatsapp, setWhatsapp] = useState("")
  const [completing, setCompleting] = useState(false)

  async function completeOnboarding() {
    setCompleting(true)
    try {
      await fetch("/api/onboarding/complete", { method: "POST" })
      toast.success("You're all set! Welcome to SPAY 🎉")
      router.refresh()
    } catch {
      toast.error("Something went wrong. Try again!")
      setCompleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-none border border-border/70 bg-card shadow-2xl relative">
        <button
          onClick={completeOnboarding}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Skip Onboarding"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Progress bar */}
        <div className="flex border-b border-border/70">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 transition-all duration-500 ${i < step ? "bg-primary" : "bg-border/40"}`}
            />
          ))}
        </div>

        <div className="px-8 py-7">
          {/* Step label */}
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Step {step} of {STEPS}
          </p>

          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-3xl font-bold">Welcome to SPAY 👋</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Let&apos;s set up your workspace in 2 minutes
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Workspace name</label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary transition-colors"
                />
              </div>
              <Button
                className="w-full rounded-none"
                onClick={() => setStep(2)}
                disabled={!workspaceName.trim()}
              >
                Looks good, continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Add First Subscription */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-3xl font-bold">Add your first subscription</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Don&apos;t worry, you can add more later
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  {
                    icon: <Pencil className="h-5 w-5" />,
                    title: "Add Manually",
                    desc: "Type in a subscription you know",
                    href: "/dashboard/subscriptions",
                  },
                  {
                    icon: <FileText className="h-5 w-5" />,
                    title: "Upload Bank Statement",
                    desc: "We'll detect SaaS charges automatically",
                    href: "/dashboard/import",
                  },
                  {
                    icon: <Mail className="h-5 w-5" />,
                    title: "Connect Gmail",
                    desc: "Scan receipts from your inbox",
                    href: "/dashboard/connect",
                  },
                ].map((option) => (
                  <button
                    key={option.title}
                    onClick={() => {
                      void completeOnboarding().then(() => router.push(option.href))
                    }}
                    className="flex items-center gap-4 rounded-none border border-border/70 bg-background px-4 py-4 text-left transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-secondary text-primary">
                      {option.icon}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{option.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <p className="text-center">
                <button
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={() => setStep(3)}
                >
                  Skip for now
                </button>
              </p>
            </div>
          )}

          {/* STEP 3: Set Up Alerts */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-3xl font-bold">Never miss a renewal</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;ll remind you before anything auto-renews
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-none border border-border/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm">Email me 30 days before renewal</span>
                  </div>
                  <Switch
                    checked={alerts.days30}
                    onCheckedChange={(v) => setAlerts((a) => ({ ...a, days30: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-none border border-border/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm">Email me 7 days before renewal</span>
                  </div>
                  <Switch
                    checked={alerts.days7}
                    onCheckedChange={(v) => setAlerts((a) => ({ ...a, days7: v }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Get WhatsApp reminders too{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    type="tel"
                    className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <Button
                className="w-full rounded-none"
                onClick={completeOnboarding}
                disabled={completing}
              >
                {completing ? (
                  "Setting up..."
                ) : (
                  <>
                    I&apos;m all set <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
