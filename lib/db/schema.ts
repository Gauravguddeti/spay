import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (verificationToken) => [
    primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  ],
)

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  // WhatsApp number for renewal alerts, e.g. "+919876543210"
  whatsappNumber: text("whatsapp_number"),
  // Alert preferences: { days30: boolean, days7: boolean, days1: boolean }
  alertPreferences: jsonb("alert_preferences"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    amountInr: numeric("amount_inr", { precision: 12, scale: 2 }).notNull(),
    billingCycle: text("billing_cycle").notNull(),
    nextRenewalDate: date("next_renewal_date", { mode: "date" }),
    status: text("status").default("active").notNull(),
    // Renamed from added_via — tracks how the subscription was detected
    detectedVia: text("detected_via").default("manual"),
    lastUsedAt: date("last_used_at", { mode: "date" }),
    // Usage health status
    usageStatus: text("usage_status").default("unknown").notNull(),
    // Original currency fields — populated when detected from Gmail receipts
    // INR conversion uses a static rate map; see lib/integrations/gmail.ts
    originalAmount: numeric("original_amount", { precision: 12, scale: 2 }),
    originalCurrency: text("original_currency").default("INR"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "subscriptions_billing_cycle_check",
      sql`${table.billingCycle} in ('monthly', 'annual', 'one-time')`,
    ),
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'cancelled', 'paused')`,
    ),
    // Renamed constraint: added_via → detected_via with updated allowed values
    check(
      "subscriptions_detected_via_check",
      sql`${table.detectedVia} in ('manual', 'gmail', 'bank_statement') or ${table.detectedVia} is null`,
    ),
    check(
      "subscriptions_usage_status_check",
      sql`${table.usageStatus} in ('active', 'unused', 'unknown')`,
    ),
  ],
)

export const renewalAlerts = pgTable("renewal_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  alertDate: date("alert_date", { mode: "date" }).notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type AlertPreferences = {
  days30: boolean
  days7: boolean
  days1: boolean
}