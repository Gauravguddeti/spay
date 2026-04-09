import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"

export type BillingCycle = "monthly" | "annual" | "one-time"
export type SubscriptionStatus = "active" | "cancelled" | "paused"
export type AddedVia = "manual" | "pdf" | "email"

export type AddSubscriptionInput = {
  orgId: string
  name: string
  category?: string | null
  amountInr: string
  billingCycle: BillingCycle
  nextRenewalDate?: Date | null
  status?: SubscriptionStatus
  addedVia?: AddedVia
  lastUsedAt?: Date | null
}

export type UpdateSubscriptionInput = Partial<
  Pick<
    AddSubscriptionInput,
    "name" | "category" | "amountInr" | "billingCycle" | "nextRenewalDate" | "status" | "addedVia" | "lastUsedAt"
  >
>

export async function getSubscriptionsByOrg(orgId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .orderBy(desc(subscriptions.createdAt))
}

export async function getSubscriptionByIdForOrg(id: string, orgId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.orgId, orgId)))
    .limit(1)

  return subscription ?? null
}

export async function addSubscription(data: AddSubscriptionInput) {
  const [created] = await db
    .insert(subscriptions)
    .values({
      orgId: data.orgId,
      name: data.name,
      category: data.category ?? null,
      amountInr: data.amountInr,
      billingCycle: data.billingCycle,
      nextRenewalDate: data.nextRenewalDate ?? null,
      status: data.status ?? "active",
      addedVia: data.addedVia ?? "manual",
      lastUsedAt: data.lastUsedAt ?? null,
    })
    .returning()

  return created
}

export async function updateSubscription(id: string, orgId: string, data: UpdateSubscriptionInput) {
  const [updated] = await db
    .update(subscriptions)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.amountInr !== undefined ? { amountInr: data.amountInr } : {}),
      ...(data.billingCycle !== undefined ? { billingCycle: data.billingCycle } : {}),
      ...(data.nextRenewalDate !== undefined ? { nextRenewalDate: data.nextRenewalDate } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.addedVia !== undefined ? { addedVia: data.addedVia } : {}),
      ...(data.lastUsedAt !== undefined ? { lastUsedAt: data.lastUsedAt } : {}),
    })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.orgId, orgId)))
    .returning()

  return updated ?? null
}

export async function deleteSubscription(id: string, orgId: string) {
  const [deleted] = await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.orgId, orgId)))
    .returning({ id: subscriptions.id })

  return deleted ?? null
}

export type DashboardStats = {
  totalMonthlySpendInr: number
  activeSubscriptionsCount: number
  renewingThisMonthCount: number
  potentialSavingsCount: number
  potentialSavingsInr: number
}

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  const [row] = await db
    .select({
      totalMonthlySpendInr: sql<string>`
        coalesce(sum(
          case
            when ${subscriptions.status} = 'active' and ${subscriptions.billingCycle} = 'monthly' then ${subscriptions.amountInr}
            when ${subscriptions.status} = 'active' and ${subscriptions.billingCycle} = 'annual' then ${subscriptions.amountInr} / 12
            else 0
          end
        ), 0)
      `,
      activeSubscriptionsCount: sql<number>`
        count(*) filter (where ${subscriptions.status} = 'active')
      `,
      renewingThisMonthCount: sql<number>`
        count(*) filter (
          where ${subscriptions.nextRenewalDate} is not null
            and ${subscriptions.nextRenewalDate} >= current_date
            and ${subscriptions.nextRenewalDate} <= (current_date + interval '30 day')
        )
      `,
      potentialSavingsCount: sql<number>`
        count(*) filter (
          where ${subscriptions.status} = 'active'
            and (${subscriptions.lastUsedAt} is null or ${subscriptions.lastUsedAt} < (current_date - interval '45 day'))
        )
      `,
      potentialSavingsInr: sql<string>`
        coalesce(sum(
          case
            when ${subscriptions.status} = 'active'
              and (${subscriptions.lastUsedAt} is null or ${subscriptions.lastUsedAt} < (current_date - interval '45 day'))
              and ${subscriptions.billingCycle} = 'monthly' then ${subscriptions.amountInr}
            when ${subscriptions.status} = 'active'
              and (${subscriptions.lastUsedAt} is null or ${subscriptions.lastUsedAt} < (current_date - interval '45 day'))
              and ${subscriptions.billingCycle} = 'annual' then ${subscriptions.amountInr} / 12
            else 0
          end
        ), 0)
      `,
    })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))

  return {
    totalMonthlySpendInr: Number(row?.totalMonthlySpendInr ?? 0),
    activeSubscriptionsCount: Number(row?.activeSubscriptionsCount ?? 0),
    renewingThisMonthCount: Number(row?.renewingThisMonthCount ?? 0),
    potentialSavingsCount: Number(row?.potentialSavingsCount ?? 0),
    potentialSavingsInr: Number(row?.potentialSavingsInr ?? 0),
  }
}