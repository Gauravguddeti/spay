-- Migration 0001: Schema updates (Section 3 + Section 6e)
-- - Rename added_via → detected_via on subscriptions
-- - Update CHECK constraint to new allowed values
-- - Add usage_status column to subscriptions
-- - Add original_amount, original_currency columns to subscriptions
-- - Add sent_at column to renewal_alerts
-- - Add whatsapp_number, alert_preferences columns to organizations

--> statement-breakpoint

-- 1. Rename added_via → detected_via
ALTER TABLE "subscriptions" RENAME COLUMN "added_via" TO "detected_via";
--> statement-breakpoint

-- 2. Drop old CHECK constraint on added_via
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_added_via_check";
--> statement-breakpoint

-- 3. Add new CHECK constraint for detected_via with updated allowed values
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_detected_via_check"
  CHECK ("detected_via" in ('manual', 'gmail', 'bank_statement') OR "detected_via" IS NULL);
--> statement-breakpoint

-- 4. Add usage_status column
ALTER TABLE "subscriptions"
  ADD COLUMN "usage_status" text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_usage_status_check"
  CHECK ("usage_status" in ('active', 'unused', 'unknown'));
--> statement-breakpoint

-- 5. Add original_amount and original_currency columns (for Gmail-detected subscriptions)
ALTER TABLE "subscriptions"
  ADD COLUMN "original_amount" numeric(12, 2),
  ADD COLUMN "original_currency" text DEFAULT 'INR';
--> statement-breakpoint

-- 6. Add sent_at to renewal_alerts (replaces relying only on is_sent boolean)
ALTER TABLE "renewal_alerts"
  ADD COLUMN "sent_at" timestamp with time zone;
--> statement-breakpoint

-- 7. Add WhatsApp notification fields to organizations
ALTER TABLE "organizations"
  ADD COLUMN "whatsapp_number" text,
  ADD COLUMN "alert_preferences" jsonb;
