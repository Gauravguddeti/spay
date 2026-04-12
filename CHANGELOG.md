# Changelog

## 2026-04-12
- Performance stabilization pass (A + B):
- Pass A hardening: reduced initial dashboard jank with safer loading behavior, tightened middleware/CSP behavior, and addressed key image/navigation regressions.
- Pass B architecture: split dashboard shell into server-rendered layout plus focused client islands to reduce hydration cost.
- Added lazy-loading boundaries for quick-add modal and insights chart payloads to keep non-critical JS out of initial route bundles.
- Implemented optimistic subscription CRUD flows (add/edit/delete/status moves) with rollback-safe updates and cross-view sync events.
- Removed N+1 access patterns in weekly digest and bulk subscription ingestion by batching org/subscription and preference lookups.
- Reduced root font payload to the required families/weights with swap display strategy for better rendering performance.
- Updated renewal calendar and navigation progress behavior to use immediate local state transitions and route-state completion events.

- Security and code quality fixes:
- Hardened `/api/alerts/send` authentication to fail closed when `CRON_SECRET` is missing and to return `401` for invalid bearer tokens.
- Added WhatsApp alert number fields to onboarding and dashboard settings, including optional warning states when missing.
- Added graceful skipped-alert logging for orgs without WhatsApp numbers with `Sentry.captureMessage` instrumentation.
- Enforced per-timing renewal preferences in both alert scheduling and send-time delivery logic.
- Added renewal alert metadata support (`skipped_reason`) and applied DB migration to keep runtime schema aligned.
- Added missing daily alerts cron (`30 3 * * *`) in `vercel.json` while preserving weekly digest cron.
- Expanded `.env.local.example` with required Neon Auth keys and clearer required/optional documentation.
- Locked dev test-user bypass logic behind `NODE_ENV === "development"` and replaced hardcoded ID with `DEV_TEST_USER_ID` env-based constant.
- Removed duplicate/unused shared skeleton/theme components and archived unused files under `_archive/components`.
- Added in-memory limiter cleanup to bound stale map growth and clarified Redis vs fallback limiter usage.
- Migrated CSP handling to middleware nonce-based policy and removed static `unsafe-inline` script policy from Next config.

## 2026-04-09
- Reorganized app routes into auth, marketing, and dashboard groups.
- Moved marketing-only sections under app/(marketing)/components.
- Consolidated dashboard-specific components under components/dashboard.
- Added utility modules under lib/utils and type declarations under types.
- Added landing-edits policy README and archived ambiguous legacy files.
