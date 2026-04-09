"use client"

import { useEffect, useMemo, useState } from "react"
import {
  siDiscord,
  siFigma,
  siGithub,
  siNotion,
  siVercel,
  siZoom,
  type SimpleIcon,
} from "simple-icons"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type BillingCycle = "monthly" | "annual" | "one-time"
type SubscriptionStatus = "active" | "cancelled" | "paused"

export type SubscriptionFormValues = {
  id?: string
  name: string
  category: string
  amountInr: string
  billingCycle: BillingCycle
  nextRenewalDate: string
  status: SubscriptionStatus
  lastUsedAt: string
}

type AddSubscriptionModalProps = {
  mode: "add" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: SubscriptionFormValues
  onSubmit: (values: SubscriptionFormValues) => Promise<void>
}

const categories = [
  "Productivity",
  "Design",
  "Communication",
  "DevTools",
  "Marketing",
  "Finance",
  "Other",
] as const

const logos: Record<string, SimpleIcon> = {
  notion: siNotion,
  slack: siDiscord,
  figma: siFigma,
  zoom: siZoom,
  github: siGithub,
  vercel: siVercel,
}

function defaultFormValues(): SubscriptionFormValues {
  return {
    name: "",
    category: "Productivity",
    amountInr: "",
    billingCycle: "monthly",
    nextRenewalDate: "",
    status: "active",
    lastUsedAt: "",
  }
}

export function AddSubscriptionModal({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSubmit,
}: AddSubscriptionModalProps) {
  const [values, setValues] = useState<SubscriptionFormValues>(defaultFormValues())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? defaultFormValues())
      setError(null)
    }
  }, [open, initialValues])

  const matchedLogo = useMemo(() => {
    const value = values.name.toLowerCase()
    return Object.entries(logos).find(([keyword]) => value.includes(keyword))?.[1] ?? null
  }, [values.name])

  function setField<K extends keyof SubscriptionFormValues>(key: K, value: SubscriptionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values.name.trim()) {
      setError("Service name is required")
      return
    }

    if (!values.amountInr || Number(values.amountInr) <= 0) {
      setError("Amount must be greater than zero")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this subscription",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="rounded-none border-border/70 bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {mode === "add" ? "Add Subscription" : "Edit Subscription"}
          </DialogTitle>
          <DialogDescription>
            Track each SaaS renewal and get visibility into monthly spend.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="service-name">Service Name</Label>
            <div className="relative">
              <Input
                id="service-name"
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Notion"
                required
                value={values.name}
              />
              {matchedLogo ? (
                <span className="absolute top-1/2 right-3 -translate-y-1/2">
                  <svg
                    aria-label="Vendor icon"
                    fill={`#${matchedLogo.hex}`}
                    height="16"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <path d={matchedLogo.path} />
                  </svg>
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                onValueChange={(value) => setField("category", value)}
                value={values.category}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount in Rs</Label>
              <Input
                id="amount"
                min="0"
                onChange={(event) => setField("amountInr", event.target.value)}
                placeholder="1499"
                step="0.01"
                type="number"
                value={values.amountInr}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select
                onValueChange={(value: BillingCycle) => setField("billingCycle", value)}
                value={values.billingCycle}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(value: SubscriptionStatus) => setField("status", value)}
                value={values.status}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renewal-date">Next Renewal Date</Label>
              <Input
                id="renewal-date"
                onChange={(event) => setField("nextRenewalDate", event.target.value)}
                type="date"
                value={values.nextRenewalDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-used">When did your team last use this?</Label>
              <Input
                id="last-used"
                onChange={(event) => setField("lastUsedAt", event.target.value)}
                type="date"
                value={values.lastUsedAt}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button className="rounded-none" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? mode === "add"
                  ? "Adding..."
                  : "Saving..."
                : mode === "add"
                  ? "Add Subscription"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}