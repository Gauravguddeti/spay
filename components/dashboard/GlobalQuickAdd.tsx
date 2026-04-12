"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { QuickAddButton } from "@/components/ui/QuickAddButton"
import type { SubscriptionFormValues } from "@/components/dashboard/AddSubscriptionModal"

const AddSubscriptionModal = dynamic(
  () =>
    import("@/components/dashboard/AddSubscriptionModal").then(
      (module) => module.AddSubscriptionModal,
    ),
  { ssr: false },
)

type AddedSubscription = {
  id: string
  name: string
  category: string | null
  amountInr: string
  billingCycle: string
  status: string
  nextRenewalDate: string | null
  lastUsedAt: string | null
  notes?: string | null
}

const SUBSCRIPTION_ADDED_EVENT = "spay:subscription-added"

export function GlobalQuickAdd() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Define routes where we don't want the button to appear.
  // We can hide it on /dashboard/subscriptions if it handles its own via Kanban?
  // But wait! The Kanban kanban board has its own Add Manually button in the dropdown. 
  // Having the global button is actually better anyway. We'll show it everywhere inside /dashboard.
  if (pathname?.includes("/import/email")) return null

  async function handleSubmit(values: SubscriptionFormValues) {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        amountInr: Number(values.amountInr),
        billingCycle: values.billingCycle,
        nextRenewalDate: values.nextRenewalDate || null,
        status: values.status,
        detectedVia: "manual",
        lastUsedAt: values.lastUsedAt || null,
        notes: values.notes || null,
      }),
    })

    const result = (await response.json()) as {
      error?: string
      subscription?: AddedSubscription
    }

    if (!response.ok) {
      throw new Error(result.error ?? "Failed to add subscription")
    }

    if (result.subscription) {
      window.dispatchEvent(
        new CustomEvent<AddedSubscription>(SUBSCRIPTION_ADDED_EVENT, {
          detail: result.subscription,
        }),
      )
    }

    toast.success("Subscription added!")
    setOpen(false)

    // Fallback for routes without local subscription list state.
    if (!pathname?.startsWith("/dashboard/subscriptions")) {
      router.refresh()
    }
  }

  return (
    <>
      <QuickAddButton onClick={() => setOpen(true)} />
      <AddSubscriptionModal
        mode="add"
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
      />
    </>
  )
}
