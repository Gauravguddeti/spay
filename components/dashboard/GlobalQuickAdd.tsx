"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { QuickAddButton } from "@/components/ui/QuickAddButton"
import { AddSubscriptionModal, SubscriptionFormValues } from "@/components/dashboard/AddSubscriptionModal"

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

    if (!response.ok) {
      const result = (await response.json()) as { error?: string }
      throw new Error(result.error ?? "Failed to add subscription")
    }

    toast.success("Subscription added!")
    setOpen(false)
    router.refresh()
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
