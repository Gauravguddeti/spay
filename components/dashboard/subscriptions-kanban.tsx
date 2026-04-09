"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KanbanBoard, type KanbanColumn } from "@/components/ui/trello-kanban-board"
import { AddSubscriptionModal, type SubscriptionFormValues } from "@/components/dashboard/AddSubscriptionModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { toInputDate } from "@/lib/utils/dates"

type Subscription = {
  id: string
  name: string
  amountInr: string
  category: string | null
  status: string
  billingCycle: string
  nextRenewalDate: Date | string | null
  lastUsedAt: Date | string | null
}

function formatInr(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function SubscriptionsKanban({ subscriptions }: { subscriptions: Subscription[] }) {
  const router = useRouter()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const modalInitialValues = React.useMemo<SubscriptionFormValues | undefined>(() => {
    if (!editing) return undefined

    return {
      id: editing.id,
      name: editing.name,
      category: editing.category ?? "Other",
      amountInr: Number(editing.amountInr).toString(),
      billingCycle: editing.billingCycle as "monthly" | "annual" | "one-time",
      nextRenewalDate: toInputDate(editing.nextRenewalDate),
      status: editing.status as "active" | "cancelled" | "paused",
      lastUsedAt: toInputDate(editing.lastUsedAt),
    }
  }, [editing])

  async function handleModalSubmit(values: SubscriptionFormValues) {
    const endpoint = `/api/subscriptions/${values.id}`
    const method = "PATCH"

    const response = await fetch(endpoint, {
      method,
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
      }),
    })

    if (!response.ok) {
      const result = (await response.json()) as { error?: string }
      toast.error(result.error ?? "Failed to update subscription")
      throw new Error(result.error ?? "Request failed")
    }

    toast.success("Subscription updated!")
    setEditing(null)
    setModalOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleting) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/subscriptions/${deleting.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        toast.error(result.error ?? "Delete failed")
        return
      }

      toast.success("Subscription deleted")
      setDeleting(null)
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  // Map database subscriptions to Kanban columns
  const initialColumns: KanbanColumn[] = React.useMemo(() => {
    const mapSub = (s: Subscription) => ({
      id: s.id,
      title: s.name,
      description: `${formatInr(s.amountInr)}/mo`,
      labels: s.category ? [s.category] : [],
    })

    const activeTasks = subscriptions.filter((s) => s.status === "active").map(mapSub)
    const pausedTasks = subscriptions.filter((s) => s.status === "paused").map(mapSub)
    const cancelledTasks = subscriptions.filter((s) => s.status === "cancelled").map(mapSub)

    return [
      { id: "active", title: "Active Spending", tasks: activeTasks },
      { id: "paused", title: "Paused / On-Hold", tasks: pausedTasks },
      { id: "cancelled", title: "Cancelled", tasks: cancelledTasks },
    ]
  }, [subscriptions])

  const handleTaskMove = async (taskId: string, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return

    const updatePromise = fetch(`/api/subscriptions/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toCol }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to update status")
      router.refresh()
    })

    toast.promise(updatePromise, {
      loading: "Updating status...",
      success: `Subscription moved to ${toCol}!`,
      error: "Failed to update subscription.",
    })
  }

  const handleTaskEdit = (taskId: string) => {
    const sub = subscriptions.find((s) => s.id === taskId)
    if (sub) {
      setEditing(sub)
      setModalOpen(true)
    }
  }

  const handleTaskDelete = (taskId: string) => {
    const sub = subscriptions.find((s) => s.id === taskId)
    if (sub) {
      setDeleting(sub)
    }
  }

  return (
    <div className="pt-4">
      <KanbanBoard
        columns={initialColumns}
        onTaskMove={handleTaskMove}
        onTaskEdit={handleTaskEdit}
        onTaskDelete={handleTaskDelete}
        allowAddTask={false}
        columnColors={{
          active: "bg-emerald-500",
          paused: "bg-amber-500",
          cancelled: "bg-red-500",
        }}
      />

      <AddSubscriptionModal
        initialValues={modalInitialValues}
        mode="edit"
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={handleModalSubmit}
        open={modalOpen}
      />

      <AlertDialog onOpenChange={(open) => !open && setDeleting(null)} open={!!deleting}>
        <AlertDialogContent className="rounded-none border-border/70 sm:rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
