"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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

type SubscriptionPayload = Partial<Subscription> & {
  id: string
  name: string
}

const SUBSCRIPTION_ADDED_EVENT = "spay:subscription-added"

function formatInr(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function normalizeSubscription(input: SubscriptionPayload): Subscription {
  return {
    id: input.id,
    name: input.name,
    amountInr: String(input.amountInr ?? "0"),
    category: input.category ?? null,
    status: input.status ?? "active",
    billingCycle: input.billingCycle ?? "monthly",
    nextRenewalDate: input.nextRenewalDate ?? null,
    lastUsedAt: input.lastUsedAt ?? null,
    notes: input.notes ?? null,
  }
}

export function SubscriptionsKanban({ subscriptions }: { subscriptions: Subscription[] }) {
  const router = useRouter()
  const [subscriptionItems, setSubscriptionItems] = useState<Subscription[]>(subscriptions)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const highlightTimeoutsRef = React.useRef<Map<string, number>>(new Map())

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cancellation dialog state
  const [cancellationSub, setCancellationSub] = useState<Subscription | null>(null)
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false)

  useEffect(() => {
    setSubscriptionItems(subscriptions)
  }, [subscriptions])

  function markSubscriptionHighlighted(subscriptionId: string) {
    setHighlightedIds((prev) => {
      const next = new Set(prev)
      next.add(subscriptionId)
      return next
    })

    const existingTimeout = highlightTimeoutsRef.current.get(subscriptionId)
    if (existingTimeout) {
      window.clearTimeout(existingTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev)
        next.delete(subscriptionId)
        return next
      })
      highlightTimeoutsRef.current.delete(subscriptionId)
    }, 2200)

    highlightTimeoutsRef.current.set(subscriptionId, timeoutId)
  }

  useEffect(() => {
    return () => {
      for (const timeoutId of highlightTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      highlightTimeoutsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    function onSubscriptionAdded(event: Event) {
      const detail = (event as CustomEvent<SubscriptionPayload>).detail
      if (!detail?.id) return

      const incoming = normalizeSubscription(detail)
      markSubscriptionHighlighted(incoming.id)
      setSubscriptionItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === incoming.id)
        if (existingIndex === -1) {
          return [incoming, ...prev]
        }

        const next = [...prev]
        next[existingIndex] = { ...next[existingIndex], ...incoming }
        return next
      })
    }

    window.addEventListener(SUBSCRIPTION_ADDED_EVENT, onSubscriptionAdded as EventListener)
    return () => {
      window.removeEventListener(SUBSCRIPTION_ADDED_EVENT, onSubscriptionAdded as EventListener)
    }
  }, [])

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

    const result = (await response.json()) as {
      error?: string
      subscription?: SubscriptionPayload
    }

    if (!response.ok) {
      toast.error(result.error ?? "Request failed")
      throw new Error(result.error ?? "Request failed")
    }

    if (result.subscription) {
      const incoming = normalizeSubscription(result.subscription)
      markSubscriptionHighlighted(incoming.id)
      setSubscriptionItems((prev) => {
        if (modalMode === "add") {
          return [incoming, ...prev]
        }
        return prev.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item))
      })
    }

    toast.success(modalMode === "add" ? "Subscription added!" : "Subscription updated!")
    setEditing(null)
    setModalOpen(false)
  }

  async function handleDelete() {
    if (!deleting) return
    const deletingSubscription = deleting
    const previousSubscriptions = subscriptionItems

    setIsDeleting(true)
    setRemovingIds((prev) => {
      const next = new Set(prev)
      next.add(deletingSubscription.id)
      return next
    })

    // Let the card animate out before removing it from the board state.
    await new Promise((resolve) => setTimeout(resolve, 180))
    setSubscriptionItems((prev) =>
      prev.filter((subscription) => subscription.id !== deletingSubscription.id),
    )

    try {
      const response = await fetch(`/api/subscriptions/${deletingSubscription.id}`, { method: "DELETE" })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        setSubscriptionItems(previousSubscriptions)
        toast.error(result.error ?? "Delete failed")
        return
      }
      toast.success("Subscription deleted")
      setDeleting(null)
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(deletingSubscription.id)
        return next
      })
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
      highlighted: highlightedIds.has(s.id),
      removing: removingIds.has(s.id),
    })
    return [
      {
        id: "active",
        title: "Active Spending",
        tasks: subscriptionItems.filter((s) => s.status === "active").map(mapSub),
      },
      {
        id: "paused",
        title: "Paused / On-Hold",
        tasks: subscriptionItems.filter((s) => s.status === "paused").map(mapSub),
      },
      {
        id: "cancelled",
        title: "Cancelled",
        tasks: subscriptionItems.filter((s) => s.status === "cancelled").map(mapSub),
      },
    ]
  }, [subscriptionItems, highlightedIds, removingIds])

  const handleTaskMove = (taskId: string, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return

    // If moving INTO cancelled, show the cancellation dialog instead of direct PATCH
    if (toCol === "cancelled") {
      const sub = subscriptionItems.find((s) => s.id === taskId)
      if (sub) {
        setCancellationSub(sub)
        setCancellationDialogOpen(true)
        return
      }
    }

    const previousStatus = subscriptionItems.find((subscription) => subscription.id === taskId)?.status
    setSubscriptionItems((prev) =>
      prev.map((subscription) =>
        subscription.id === taskId ? { ...subscription, status: toCol } : subscription,
      ),
    )

    const updatePromise = fetch(`/api/subscriptions/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toCol }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to update status")
      })
      .catch((error: unknown) => {
        if (previousStatus) {
          setSubscriptionItems((prev) =>
            prev.map((subscription) =>
              subscription.id === taskId
                ? { ...subscription, status: previousStatus }
                : subscription,
            ),
          )
        }
        throw error
      })

    toast.promise(updatePromise, {
      loading: "Updating status...",
      success: `Moved to ${toCol}!`,
      error: "Failed to update subscription.",
    })
  }

  const handleTaskEdit = (taskId: string) => {
    const sub = subscriptionItems.find((s) => s.id === taskId)
    if (sub) {
      setEditing(sub)
      setModalMode("edit")
      setModalOpen(true)
    }
  }

  const handleTaskDelete = (taskId: string) => {
    const sub = subscriptionItems.find((s) => s.id === taskId)
    if (sub) setDeleting(sub)
  }

  function openAddModal() {
    setEditing(null)
    setModalMode("add")
    setModalOpen(true)
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-none border bg-[var(--surface-raised)] px-6 py-5 shadow-[var(--shadow-sm)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [border-color:var(--border-subtle)]">
        <div>
          <div className="accent-line" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white">Your Stack</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Drag cards to update status</p>
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
                <Link href="/dashboard/import/email">
                  <Mail className="mr-2 h-4 w-4" />
                  Import from Gmail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/dashboard/import">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Bank Statement
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
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
      </div>

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
          onComplete={(nextStatus) => {
            setSubscriptionItems((prev) =>
              prev.map((subscription) =>
                subscription.id === cancellationSub.id
                  ? { ...subscription, status: nextStatus }
                  : subscription,
              ),
            )
          }}
        />
      )}
    </div>
  )
}
