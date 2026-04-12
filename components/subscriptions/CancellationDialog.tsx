"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface CancellationDialogProps {
  subscriptionId: string
  subscriptionName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (status: "cancelled" | "paused") => void
}

export function CancellationDialog({
  subscriptionId,
  subscriptionName,
  open,
  onOpenChange,
  onComplete,
}: CancellationDialogProps) {
  const [step, setStep] = useState<"confirm" | "date">("confirm")
  const [cancelledAt, setCancelledAt] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  async function handleActuallyCancelled() {
    setStep("date")
  }

  async function handleConfirmWithDate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancelledAt: new Date(cancelledAt).toISOString(),
          cancellationVerified: true,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Marked as cancelled. We'll flag if charges reappear.")
      onOpenChange(false)
      onComplete("cancelled")
    } catch {
      toast.error("Failed to update subscription")
    } finally {
      setLoading(false)
    }
  }

  async function handleNotYet() {
    setLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Moved to Paused. Remember to actually cancel it!")
      onOpenChange(false)
      onComplete("paused")
    } catch {
      toast.error("Failed to update subscription")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep("confirm")
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="rounded-none border-border/70 sm:rounded-none max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-xl">
            {step === "confirm" ? `Cancelling ${subscriptionName}?` : "When did you cancel it?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === "confirm"
              ? "Have you actually cancelled this subscription yet?"
              : "We'll flag if this charge appears again in your next bank statement import."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === "confirm" && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full rounded-none"
              onClick={handleActuallyCancelled}
              disabled={loading}
            >
              ✅ Yes, I cancelled it
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-none"
              onClick={handleNotYet}
              disabled={loading}
            >
              🕐 Not yet, just planning to
            </Button>
            <button
              className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClose}
            >
              Never mind
            </button>
          </div>
        )}

        {step === "date" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cancellation date</label>
              <input
                type="date"
                value={cancelledAt}
                onChange={(e) => setCancelledAt(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll flag if this charge appears again in your next bank statement import.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setStep("confirm")}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                className="flex-1 rounded-none"
                onClick={handleConfirmWithDate}
                disabled={loading}
              >
                {loading ? "Saving..." : "Confirm cancellation"}
              </Button>
            </div>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
