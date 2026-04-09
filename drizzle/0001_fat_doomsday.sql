ALTER TABLE "subscriptions" RENAME COLUMN "added_via" TO "detected_via";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_added_via_check";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "whatsapp_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "alert_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "renewal_alerts" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "usage_status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "original_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "original_currency" text DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_detected_via_check" CHECK ("subscriptions"."detected_via" in ('manual', 'gmail', 'bank_statement') or "subscriptions"."detected_via" is null);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_usage_status_check" CHECK ("subscriptions"."usage_status" in ('active', 'unused', 'unknown'));