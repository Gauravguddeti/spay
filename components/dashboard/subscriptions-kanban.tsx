"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, Plus, FileText, Mail, Download } from "lucide-react"

import { KanbanBoard, type KanbanColumn } from "@/components/ui/trello-kanban-board"
import { AddSubscriptionModal, type SubscriptionFormValues } from "@/components/dashboard/AddSubscriptionModal"
import { CancellationDialog } from "@/components/subscriptions/CancellationDialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
  notes?: string | null
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
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cancellation dialog state
  const [cancellationSub, setCancellationSub] = useState<Subscription | null>(null)
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false)

  const modalInitialValues = useMemo<SubscriptionFormValues | undefined>(() => {
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
      notes: editing.notes ?? "",
    }
  }, [editing])

  async function handleModalSubmit(values: SubscriptionFormValues) {
    const endpoint =
      modalMode === "add" ? "/api/subscriptions" : `/api/subscriptions/${values.id}`
    const method = modalMode === "add" ? "POST" : "PATCH"

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
        notes: values.notes || null,
      }),
    })

    if (!response.ok) {
      const result = (await response.json()) as { error?: string }
      toast.error(result.error ?? "Request failed")
      throw new Error(result.error ?? "Request failed")
    }

    toast.success(modalMode === "add" ? "Subscription added!" : "Subscription updated!")
    setEditing(null)
    setModalOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/subscriptions/${deleting.id}`, { method: "DELETE" })
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

  const initialColumns: KanbanColumn[] = useMemo(() => {
    const mapSub = (s: Subscription) => ({
      id: s.id,
      title: s.name,
      description: `${formatInr(s.amountInr)}/mo`,
      labels: s.category ? [s.category] : [],
      assignee: s.notes ? "📝" : undefined,
    })
    return [
      {
        id: "active",
        title: "Active Spending",
        tasks: subscriptions.filter((s) => s.status === "active").map(mapSub),
      },
      {
        id: "paused",
        title: "Paused / On-Hold",
        tasks: subscriptions.filter((s) => s.status === "paused").map(mapSub),
      },
      {
        id: "cancelled",
        title: "Cancelled",
        tasks: subscriptions.filter((s) => s.status === "cancelled").map(mapSub),
      },
    ]
  }, [subscriptions])

  const handleTaskMove = (taskId: string, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return

    // If moving INTO cancelled, show the cancellation dialog instead of direct PATCH
    if (toCol === "cancelled") {
      const sub = subscriptions.find((s) => s.id === taskId)
      if (sub) {
        setCancellationSub(sub)
        setCancellationDialogOpen(true)
        return
      }
    }

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
      success: `Moved to ${toCol}!`,
      error: "Failed to update subscription.",
    })
  }

  const handleTaskEdit = (taskId: string) => {
    const sub = subscriptions.find((s) => s.id === taskId)
    if (sub) {
      setEditing(sub)
      setModalMode("edit")
      setModalOpen(true)
    }
  }

  const handleTaskDelete = (taskId: string) => {
    const sub = subscriptions.find((s) => s.id === taskId)
    if (sub) setDeleting(sub)
  }

  function openAddModal() {
    setEditing(null)
    setModalMode("add")
    setModalOpen(true)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-none border border-border/70 bg-card px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs font-mono text-muted-foreground">SUBSCRIPTIONS</p>
          <h1 className="mt-1 font-serif text-3xl">Your Stack</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Drag cards to update status</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/csv"
            className="flex items-center gap-2 rounded-none border border-border/70 bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-none">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Subscription
                <ChevronDown className="ml-1.5 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-border/70 w-52">
              <DropdownMenuItem className="cursor-pointer" onClick={openAddModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manually
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <a href="/dashboard/import/email">
                  <Mail className="mr-2 h-4 w-4" />
                  Import from Gmail
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <a href="/dashboard/import">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Bank Statement
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
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

      {/* Add / Edit Modal */}
      <AddSubscriptionModal
        initialValues={modalInitialValues}
        mode={modalMode}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={handleModalSubmit}
        open={modalOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog onOpenChange={(open) => !open && setDeleting(null)} open={!!deleting}>
        <AlertDialogContent className="rounded-none border-border/70 sm:rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be
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

      {/* Cancellation Dialog */}
      {cancellationSub && (
        <CancellationDialog
          subscriptionId={cancellationSub.id}
          subscriptionName={cancellationSub.name}
          open={cancellationDialogOpen}
          onOpenChange={(open) => {
            setCancellationDialogOpen(open)
            if (!open) setCancellationSub(null)
          }}
          onComplete={() => router.refresh()}
        />
      )}
    </div>
  )
}
