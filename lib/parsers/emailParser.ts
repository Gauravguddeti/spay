/**
 * Email Parser for SPAY — Phase 5
 *
 * Thin adapter over the Gmail integration's vendor-matching logic.
 * Provides the canonical /lib/parsers/emailParser.ts entry point.
 * The full implementation lives in lib/integrations/gmail.ts.
 */

export type {
  DetectedSubscription as EmailDetectedSubscription,
  GmailTokens,
  RefreshedTokens,
} from "@/lib/integrations/gmail"

export {
  scanGmailForSubscriptions,
  refreshAccessTokenIfNeeded,
} from "@/lib/integrations/gmail"
