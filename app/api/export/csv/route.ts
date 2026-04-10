import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getOrganizationByOwnerId } from "@/lib/db/queries/users"
import { getSubscriptionsByOrg } from "@/lib/db/queries/subscriptions"

export const runtime = "nodejs"

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = await getOrganizationByOwnerId(session.user.id, session.user.orgId)
  if (!org) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const subs = await getSubscriptionsByOrg(org.id)

  const headers = [
    "Name",
    "Category",
    "Amount (₹)",
    "Billing Cycle",
    "Next Renewal Date",
    "Status",
    "Last Used",
    "Added Via",
    "Cancelled At",
    "Notes",
    "Created At",
  ]

  const rows = subs.map((s) => [
    escapeCSV(s.name),
    escapeCSV(s.category),
    escapeCSV(Number(s.amountInr).toFixed(2)),
    escapeCSV(s.billingCycle),
    escapeCSV(s.nextRenewalDate ? new Date(s.nextRenewalDate).toISOString().split("T")[0] : null),
    escapeCSV(s.status),
    escapeCSV(s.lastUsedAt ? new Date(s.lastUsedAt).toISOString().split("T")[0] : null),
    escapeCSV(s.detectedVia),
    escapeCSV(s.cancelledAt ? new Date(s.cancelledAt).toISOString().split("T")[0] : null),
    escapeCSV(s.notes),
    escapeCSV(new Date(s.createdAt).toISOString().split("T")[0]),
  ])

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const dateStr = new Date().toISOString().split("T")[0]

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="spay-export-${dateStr}.csv"`,
    },
  })
}
