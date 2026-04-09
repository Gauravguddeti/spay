# SPAY

Spay is a SaaS subscription spend control app for startup teams. It combines manual tracking with Gmail-assisted detection, then sends renewal reminders over WhatsApp so teams can reduce surprise renewals and identify waste.

## Product Overview

Spay helps teams answer three questions quickly:

- What are we paying for every month?
- What is renewing soon?
- Which tools are likely unused and can be cut?

Core capabilities:

- Secure authentication with email/password and optional Google OAuth.
- Organization-scoped subscription management (create, edit, delete).
- Dashboard metrics for monthly spend, active tools, upcoming renewals, and potential savings.
- Gmail receipt/invoice scanning to detect likely subscriptions.
- Renewal alert scheduling and automated WhatsApp delivery.

## Current Route Surface

There is no public marketing homepage route in the current app tree. Active user-facing routes are focused on authentication and the dashboard experience.

Auth routes:

- `/login`
- `/signup`

Dashboard routes:

- `/dashboard` - spend overview and next renewals
- `/dashboard/subscriptions` - subscription CRUD UI
- `/dashboard/connect` - Gmail connection and import flow
- `/dashboard/calendar` - renewal calendar for next 30 days
- `/dashboard/settings` - WhatsApp number and alert preferences
- `/dashboard/insights` - placeholder page for a future phase

## Architecture Snapshot

Application layer:

- Next.js App Router with server-first route handlers and server components.
- React 19 + TypeScript.
- Tailwind-based UI with Radix primitives.

Authentication and identity:

- NextAuth (JWT session strategy).
- Drizzle adapter for auth persistence.
- Credentials provider for email/password sign-in.
- Optional Google provider with Gmail readonly scope.

Data layer:

- Postgres via Neon-compatible connection.
- Drizzle ORM and Drizzle Kit migrations.

Operational integrations:

- Upstash Redis rate limiting in middleware.
- Twilio WhatsApp messages for renewal alerts.
- Vercel cron for daily alert dispatch.
- Sentry for error capture and source map upload controls.

## Main User Flows

### 1. Account creation and org bootstrap

1. User signs up with name, email, password, and organization name.
2. Backend creates a user and default organization.
3. User is auto-signed-in with credentials and redirected to dashboard.

### 2. Manual subscription management

1. User adds subscriptions in `/dashboard/subscriptions`.
2. Subscriptions are stored with billing cycle, amount, status, and renewal date.
3. User can update or delete subscriptions through scoped API endpoints.

### 3. Gmail detection and import

1. User connects Google account on `/dashboard/connect`.
2. System requests Gmail readonly access.
3. Scan endpoint reads recent invoice/receipt-like messages.
4. Vendor and amount signals are extracted and converted to INR.
5. User chooses detected items to import into subscriptions.

### 4. Renewal reminders

1. User sets WhatsApp number and alert preferences in `/dashboard/settings`.
2. App creates renewal alert rows for selected timing windows.
3. Daily cron executes alert sender endpoint.
4. Unsent alerts due today are delivered over Twilio WhatsApp.

## API Reference

All endpoints return JSON.

### Authentication

- `GET|POST /api/auth/[...nextauth]`
  - NextAuth handlers.
- `POST /api/auth/signup`
  - Creates a credentials user and organization.
  - Validates input with Zod.
  - Rejects duplicate emails.

### Subscriptions

- `POST /api/subscriptions`
  - Creates a new subscription for the authenticated user's organization.
- `PATCH /api/subscriptions/[id]`
  - Updates a specific subscription in the same organization.
- `DELETE /api/subscriptions/[id]`
  - Deletes a specific subscription in the same organization.

### Organization settings

- `GET /api/organizations`
  - Returns current organization settings.
- `PATCH /api/organizations`
  - Updates WhatsApp number and alert preferences.

### Gmail integration

- `POST /api/integrations/gmail/scan`
  - Requires authenticated session with Google access token.
  - Refreshes token when nearing expiry.
  - Returns detected subscription candidates.

### Alerts

- `POST /api/alerts/create`
  - Creates a renewal alert for a subscription and timing (30, 7, or 1 day).
- `POST /api/alerts/send`
  - Sends due alerts for today and marks successful sends.
  - Supports `Authorization: Bearer <CRON_SECRET>` protection when configured.

## Data Model

Primary tables:

- `users` - identity records (credentials and profile).
- `accounts` - OAuth account links and provider tokens.
- `sessions` - session persistence for auth adapter.
- `verification_tokens` - token store for auth flows.
- `organizations` - account container, owner link, WhatsApp and alert preferences.
- `subscriptions` - tracked tools, billing cycle, renewal date, status, usage signals.
- `renewal_alerts` - queued reminder entries and delivery metadata.

Notable domain fields:

- `subscriptions.billingCycle`: `monthly | annual | one-time`
- `subscriptions.status`: `active | cancelled | paused`
- `subscriptions.detectedVia`: `manual | gmail | bank_statement`
- `subscriptions.usageStatus`: `active | unused | unknown`
- `organizations.alertPreferences`: JSON object `{ days30, days7, days1 }`

## Security and Access Controls

Authentication and authorization:

- Dashboard routes require authenticated users.
- API endpoints derive organization scope from session user id.
- Subscription updates/deletes are org-scoped to prevent cross-tenant access.

Rate limiting:

- Middleware applies Upstash sliding-window limits to auth-related endpoints.
- Default policy: 10 requests per 60 seconds per IP.

Secrets and token handling:

- NextAuth secret required for stable secure sessions.
- Google OAuth refresh token path used for Gmail integration continuity.
- Cron endpoint can be protected with `CRON_SECRET`.

## Environment Variables

The repository includes `.env.local.example` with core variables. Additional keys are required for optional integrations.

Core runtime:

- `DATABASE_URL` (required)
- `AUTH_SECRET` (required)
- `GOOGLE_CLIENT_ID` (optional but required for Gmail connect flow)
- `GOOGLE_CLIENT_SECRET` (optional but required for Gmail connect flow)
- `UPSTASH_REDIS_REST_URL` (optional, enables middleware rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` (optional, enables middleware rate limiting)

Alerting and scheduled jobs:

- `TWILIO_ACCOUNT_SID` (required for WhatsApp delivery)
- `TWILIO_AUTH_TOKEN` (required for WhatsApp delivery)
- `TWILIO_WHATSAPP_FROM` (required for WhatsApp delivery)
- `CRON_SECRET` (optional but recommended for `/api/alerts/send` hardening)
- `NEXT_PUBLIC_APP_URL` (optional, used in alert message links)

Sentry integration:

- `SENTRY_ORG` (optional)
- `SENTRY_PROJECT` (optional)

Development-only helper credentials supported by auth logic:

- `DEV_TEST_EMAIL` (optional)
- `DEV_TEST_PASSWORD` (optional)
- `DEV_TEST_NAME` (optional)
- `DEV_TEST_ORG_NAME` (optional)

## Database and Migration Operations

Drizzle configuration:

- `drizzle.config.ts` reads `DATABASE_URL` from `.env.local`.
- Schema source: `lib/db/schema.ts`.
- SQL migration output: `drizzle/`.

Available scripts:

- `npm run db:generate` - generate migration files from schema changes.
- `npm run db:migrate` - apply migrations.

## Scheduled Jobs

`vercel.json` defines one cron:

- `30 3 * * *` -> `POST /api/alerts/send`

This corresponds to 3:30 AM UTC daily (9:00 AM IST).

Alert sender behavior:

- Selects unsent alerts where `alert_date = today`.
- Joins subscription and organization metadata.
- Sends WhatsApp messages when org preferences permit.
- Marks records as sent only after successful delivery.
- Captures failed sends in Sentry and leaves alerts pending for retry.

## Quality and Observability

Quality gates:

- TypeScript build errors are not ignored in Next config.
- ESLint uses flat config with Next core-web-vitals preset.

Lint scope exclusions:

- `landing-edits/**`
- `_archive/**`

Observability:

- Route-level exception capture is wired with Sentry in critical API handlers.
- Source map upload behavior is controlled through `withSentryConfig` options.

## Repository Notes

Important folders:

- `app/` - route handlers and server/client pages.
- `components/` - reusable UI and dashboard feature components.
- `lib/` - DB access, auth helpers, integrations, utilities.
- `drizzle/` - migration SQL history.
- `landing-edits/` - standalone design drafts and experiments, not active app surface.
- `_archive/` - archived code, excluded from active linting.

## Known Constraints

- Gmail detection relies on heuristic parsing (vendor/domain map + regex extraction).
- Currency conversion currently uses static INR conversion constants.
- Auto-import from Gmail defaults billing cycle to monthly; manual correction may be needed.
- Renewal alerts depend on valid Twilio WhatsApp setup and verified recipient path.

## Script Reference

From `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate`

## Roadmap Signals Present in Code

The current codebase already hints at future directions:

- richer insights page and savings analytics,
- improved Gmail parsing confidence and categorization,
- live exchange-rate based currency normalization,
- expanded usage intelligence beyond basic last-used heuristics.
