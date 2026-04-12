# Changelog

## 2026-04-12
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
