"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AddSubscriptionModal,
  type SubscriptionFormValues,
} from "@/components/dashboard/AddSubscriptionModal"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatInr } from "@/lib/utils/currency"
import { formatDisplayDate, toInputDate } from "@/lib/utils/dates"

type SubscriptionRow = {
  id: string
  name: string
  category: string | null
  amountInr: string
  billingCycle: string
  nextRenewalDate: string | Date | null
  status: string
  lastUsedAt: string | Date | null
}

type SubscriptionsTableProps = {
  subscriptions: SubscriptionRow[]
}

function statusVariant(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200"
  }

  if (status === "cancelled") {
    return "bg-red-500/20 text-red-800 border-red-200"
  }

  return "bg-amber-100 text-amber-800 border-amber-200"
}

export function SubscriptionsTable({ subscriptions }: SubscriptionsTableProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<"add" | "edit">("add")
  const [editing, setEditing] = useState<SubscriptionRow | null>(null)
  const [deleting, setDeleting] = useState<SubscriptionRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const modalInitialValues = useMemo<SubscriptionFormValues | undefined>(() => {
    if (!editing) {
      return undefined
    }

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
    const endpoint = mode === "add" ? "/api/subscriptions" : `/api/subscriptions/${values.id}`
    const method = mode === "add" ? "POST" : "PATCH"

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
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
      toast.error(result.error ?? "Request failed")
      throw new Error(result.error ?? "Request failed")
    }

    toast.success(mode === "add" ? "Subscription added!" : "Subscription updated!")
    setEditing(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleting) {
      return
    }

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

  return (
    <section className="rounded-none border border-border/70 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-muted-foreground">SUBSCRIPTIONS</p>
          <h2 className="font-serif text-3xl">All Tools</h2>
        </div>
        <Button
          className="rounded-none"
          onClick={() => {
            setMode("add")
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount (Rs)</TableHead>
            <TableHead>Billing Cycle</TableHead>
            <TableHead>Next Renewal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.length === 0 ? (
            <TableRow>
              <TableCell className="py-10 text-center text-muted-foreground" colSpan={7}>
                Add your first subscription to get started.
              </TableCell>
            </TableRow>
          ) : (
            subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium">{subscription.name}</TableCell>
                <TableCell>{subscription.category ?? "-"}</TableCell>
                <TableCell>{formatInr(Number(subscription.amountInr))}</TableCell>
                <TableCell className="capitalize">{subscription.billingCycle}</TableCell>
                <TableCell>{formatDisplayDate(subscription.nextRenewalDate)}</TableCell>
                <TableCell>
                  <Badge className={statusVariant(subscription.status)} variant="outline">
                    {subscription.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setMode("edit")
                        setEditing(subscription)
                        setModalOpen(true)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeleting(subscription)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddSubscriptionModal
        initialValues={modalInitialValues}
        mode={mode}
        onOpenChange={setModalOpen}
        onSubmit={handleModalSubmit}
        open={modalOpen}
      />

      <AlertDialog onOpenChange={(open) => !open && setDeleting(null)} open={Boolean(deleting)}>
        <AlertDialogContent className="rounded-none border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes {deleting?.name} from your org.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}