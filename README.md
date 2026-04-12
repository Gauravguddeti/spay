# SPAY

SPAY is a SaaS spend control platform for startup teams. It helps teams track subscriptions, detect likely SaaS charges from Gmail and bank statements, monitor renewals, and surface savings opportunities from underused tools.

## Current Product Snapshot

Primary capabilities currently in code:

- Neon Auth based authentication (email/password, email OTP verification, Google social sign-in).
- Organization-scoped subscription tracking with CRUD.
- Dashboard metrics (monthly spend, active subscriptions, renewals, potential savings).
- Gmail scan and review flow for subscription detection.
- PDF bank statement parsing and bulk import flow.
- CSV export for subscriptions.
- Renewal alert records with notification preferences.
- Weekly email digest cron endpoint.
- WhatsApp delivery endpoint for renewal reminders.

## Route Surface

Public routes:

- `/` marketing landing page.
- `/login`
- `/signup`
- `/forgot-password`

Dashboard routes:

- `/dashboard`
- `/dashboard/subscriptions`
- `/dashboard/connect`
- `/dashboard/import`
- `/dashboard/import/email` (redirects to `/dashboard/connect`)
- `/dashboard/calendar`
- `/dashboard/insights`
- `/dashboard/settings`

## Architecture

Application layer:

- Next.js App Router (server components + route handlers).
- React 19 + TypeScript.
- Tailwind + Radix based UI system.

Authentication:

- Neon Auth server integration via `@neondatabase/auth/next/server`.
- Auth API passthrough at `app/api/auth/[...path]/route.ts`.
- Middleware-protected dashboard routes (`/dashboard/*`).
- Email OTP flows used for sign-up verification and password reset.

Data layer:

- Postgres (Neon-compatible) via Drizzle ORM.
- Schema in `lib/db/schema.ts`, migrations in `drizzle/`.

Integrations:

- Gmail API for receipt/invoice scanning.
- Twilio for WhatsApp alert delivery.
- Resend for weekly digest email sending.
- Upstash Redis for middleware rate limiting.

## Main Flows

1. Account and onboarding

- User signs up, verifies email OTP, signs in, and completes onboarding.
- Onboarding sets workspace name and renewal reminder preferences.

2. Manual subscription management

- Add, update, and delete subscriptions in an org-scoped model.

3. Gmail import

- Connect Google account, scan Gmail, review detected subscriptions, and import selected items.

4. PDF import

- Upload bank statement PDF, parse detected SaaS charges, bulk import selected items.

5. Notifications and reporting

- Create renewal alert rows and send due reminders.
- Send weekly digest via cron endpoint.

## API Surface

Most endpoints return JSON. The CSV export endpoint returns `text/csv`.

Authentication:

- `GET|POST|PUT|PATCH|DELETE /api/auth/[...path]`
  - Neon Auth handler passthrough.
- `POST /api/auth/signup`
  - Legacy compatibility route for user + org creation.
- `POST /api/auth/legacy-verify`
  - Legacy password verification route used in migration fallback.

User and organization:

- `PATCH /api/users`
  - Update profile name or password.
- `GET /api/organizations`
- `PATCH /api/organizations`
- `DELETE /api/organizations?action=delete_subscriptions|delete_account`
- `POST /api/onboarding/complete`

Subscriptions:

- `POST /api/subscriptions`
- `POST /api/subscriptions/bulk`
- `PATCH /api/subscriptions/[id]`
- `DELETE /api/subscriptions/[id]`
- `GET /api/export/csv`

Imports and integrations:

- `POST /api/integrations/gmail/scan`
- `POST /api/import/pdf`

Alerts and jobs:

- `POST /api/alerts/create`
- `POST /api/alerts/send`
- `GET /api/cron/weekly-digest`

## Data Model

Core tables:

- `users`
- `organizations`
- `subscriptions`
- `renewal_alerts`

Compatibility and integration tables still present:

- `accounts`
- `sessions`
- `verification_tokens`

Notable enums/fields:

- `subscriptions.billingCycle`: `monthly | annual | one-time`
- `subscriptions.status`: `active | cancelled | paused`
- `subscriptions.detectedVia`: `manual | gmail | bank_statement`
- `subscriptions.usageStatus`: `active | unused | unknown`
- `organizations.alertPreferences`: `{ days30, days7, days1 }`

## Environment Variables

Required for core runtime:

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET` (must be at least 32 chars)

Auth and Gmail integration:

- `GOOGLE_CLIENT_ID` or `AUTH_GOOGLE_ID`
- `GOOGLE_CLIENT_SECRET` or `AUTH_GOOGLE_SECRET`
- `TOKEN_ENCRYPTION_KEY` (recommended for encrypted token storage path)

Rate limiting:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Notifications and email:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `RESEND_API_KEY`

Cron/auth protection and links:

- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL` (used in alert links)
- `NEXTAUTH_URL` (currently used by weekly digest endpoint for app URL)

Note: `.env.local.example` currently lists only a subset of the values used in runtime code.

## Scheduled Jobs

`vercel.json` currently defines:

- `0 3 * * 1` -> `/api/cron/weekly-digest`

Additional job endpoint available but not scheduled by default in `vercel.json`:

- `/api/alerts/send`

## Security and Ops Notes

- Dashboard access is protected by Neon Auth middleware.
- Middleware applies Upstash sliding-window rate limiting to `/api/auth/sign-in*` and `/api/auth/sign-up*`.
- Legacy auth routes use an in-memory rate limiter.
- Global HTTP security headers are configured in `next.config.mjs`.
- Critical API error paths capture exceptions via Sentry.

## Repository Layout

- `app/` routes and API handlers.
- `components/` UI and feature components.
- `lib/` auth, db, integrations, security, insights, notifications.
- `drizzle/` SQL migrations.
- `landing-edits/` design playground, not active app runtime surface.
- `_archive/` archived files.

## Scripts

From `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate`

## Current Constraints and Notes

- UI text in onboarding/settings currently frames reminders as notifications/email preferences, while `/api/alerts/send` still delivers via WhatsApp.
- `POST /api/auth/signup` and `POST /api/auth/legacy-verify` are compatibility endpoints and not the primary Neon Auth path.
- Gmail detection is heuristic and imports default to monthly billing unless edited.

## License

This repository is proprietary and marked as UNLICENSED.

You may not use, copy, modify, merge, publish, distribute, sublicense, sell, or create derivative works from this software without prior written permission from the copyright owner.

See `LICENSE` for full terms.
