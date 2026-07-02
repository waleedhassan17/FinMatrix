# PHASE2_CHANGELOG — Subscription Lifecycle (phase2.md)

Professional subscription lifecycle across THREE flows, plan-based delivery-
personnel gating, and full accounting on every plan. Built per `phase2.md`.
Audit: `SUBSCRIPTION_AUDIT.md`. Commits: backend `68b945f` (Phase A),
frontend `2cecbbe` (Phase B).

## The four guarantees (explicitly upheld)

1. **Data is NEVER discarded on expiry.** Expiry only flips the *account* to
   `inactive` (login → renew-only). No company, ledger, invoice, inventory,
   delivery, or user row is ever deleted/archived/purged. The cron
   (`billing.service.runExpiryScan`) sets `subscription_status='expired'` +
   `status='inactive'` and creates a "renew to restore" notification — nothing
   else. Renewal/upgrade approval restores `active` on the exact same data.

2. **ONE reusable pay → upload → admin-approve flow across all three flows.**
   `POST /billing/bank-details` (bill + platform bank) → `POST /billing/submit`
   (screenshot, server-set amount) → super-admin `PATCH
   /admin/payment-submissions/:id/approve|reject`. Approval runs the single
   `billing.service.approveSubmission()` for signup (NEW), renewal (RENEWAL) and
   upgrade (UPGRADE) — the `kind` is the only difference. The frontend reuses the
   same `SubscriptionPayScreen` for Flow 2 and Flow 3.

3. **Plan-based delivery-personnel limits (server-authoritative).** Free = 1,
   paid = 3, from `PLAN_CONFIG` (single source of truth). Enforced in
   `delivery-personnel.service.create()`; `GET /billing/plan-limits` drives the
   "X of LIMIT used" UI and the gated Add button. A downgrade/lapse to Free with
   >1 personnel **keeps** the extras (never deleted) and only blocks creating
   new ones until within the limit again.

4. **Full accounting on EVERY plan.** No accounting feature is gated anywhere.
   Invoicing, bills, POs, inventory, reports, journal, tax, payroll, etc. are
   identical on Free, Standard and Pro. The only enforced plan difference is the
   delivery-personnel limit. Subscription revenue is recorded in the separate
   `platform_revenue` table — **never** posted to any company's books (no journal
   entry; the accounting engine is untouched).

## Two separate concepts (kept separate)

- `accountStatus` = `companies.status` normalized to `pending | active |
  inactive | rejected` — can the user use the app?
- `subscriptionStatus` = new `companies.subscription_status` = `active |
  expiring | expired` — is the plan current?

## Backend (Phase A)

- **PLAN_CONFIG** (`modules/billing/plan-config.ts`): Free `{0, null, 1}`,
  Standard `{100000 (Rs 1,000), 6, 3}`, Pro `{200000 (Rs 2,000), 3, 3}` (minor
  units = paisa). Plus `PLATFORM_BANK` (Muhammad Waleed Hassan / Allied Bank /
  IBAN, env-overridable).
- **Company fields + migration** `1783500000000` (idempotent; plus
  `apply-subscription-schema.ts` for Heroku where `migration:run` is broken):
  `subscription_status`, `subscription_start_date`, `subscription_expiry_date`,
  `payment_status`, `last_submission_id`, `subscription_reminder_on`.
- **New tables:** `platform_payment_submissions` (NEW|RENEWAL|UPGRADE,
  server-set amount, screenshot key), `platform_revenue` (UNIQUE `submission_id`
  → approval records revenue exactly once = idempotent).
- **Endpoints:**
  - Company (JWT only, reachable while `inactive`): `GET /billing/status`,
    `GET /billing/plan-limits`, `GET /billing/bank-details?plan=`,
    `POST /billing/submit` (multipart), `GET /billing/submissions`,
    `GET /billing/submissions/:id/screenshot`.
  - Super-admin: `GET /admin/payment-submissions[?status]`,
    `PATCH …/:id/approve` (idempotent), `PATCH …/:id/reject` (reason),
    `GET …/:id/screenshot`, `POST …/run-expiry-scan` (manual cron trigger).
  - Re-added `GET /notifications`, `unread-count`, `read`, `read-all` for in-app
    renew reminders.
- **Approval math:** paid expiry = `addMonths(base, durationMonths)` where
  `base = later(now, current expiry)` for an already-paid account → early
  renewal/upgrade loses no paid days. Free → null expiry. Sets `paymentStatus=
  paid`, `subscriptionStatus=active`, `status=active`.
- **Cron** (`@nestjs/schedule`, daily 1 AM, idempotent, `BILLING_CRON=off` to
  disable): ≤10 days to expiry → `expiring` + ONE reminder/day (deduped by
  `subscription_reminder_on`); on/after expiry → `expired` + `inactive` + one
  notification. Free skipped.
- **Login gate change:** `signin` now issues a token for `inactive` accounts and
  routes them to renew-only (pending/rejected still hard-blocked). `CompanyGuard`
  keeps blocking every business endpoint for inactive companies; only
  `/billing/*` and `/notifications` stay reachable — so an expired account can
  renew but can do nothing else, server-enforced.

## Frontend (Phase B)

- `network/billingNetwork.ts` — all billing/admin APIs + auth-gated screenshot
  source; multipart upload mirrors the proven bill-photo pattern.
- `screens/Subscription/SubscriptionPayScreen.tsx` — shared bill + platform bank
  (copyable) + screenshot picker (expo-image-picker) + "awaiting verification".
- `screens/Subscription/RenewSubscriptionScreen.tsx` — Flow 2 renew-only landing
  (data-safe reassurance, current plan, awaiting/rejected banners) and Flow 3
  plan chooser from Settings.
- `BaseNavigator` — `inactive` renders ONLY the renew stack; `rejected` stays on
  CompanyRejected.
- `Settings` — Subscription section (plan / status / expiry / "X of LIMIT
  delivery personnel used") + always-available "Subscribe / Change Plan".
- `DeliveryPersonnelList` — plan-usage banner + Add gated at the limit with an
  "Upgrade your plan to add more delivery personnel" prompt.
- Super-admin **Payments** tab — reviews each submission labelled NEW / RENEWAL /
  UPGRADE with plan, amount, screenshot, Approve / Reject(reason).

## Verification

- `npx tsc --noEmit` clean in **both** repos; backend `nest build` exit 0.
- Backend jest: 16/16 pass, incl. `plan-config.spec.ts` (locks the phase2
  contract: Free=1 / Standard=3 / Pro=3, Rs 1,000·6mo, Rs 2,000·3mo) and the
  existing `auth.service.spec` (login-gate change didn't regress it).
- Accounting engine untouched; subscription revenue stays out of company books.

## Ops notes

- Set the real platform bank via env: `PLATFORM_BANK_TITLE`, `PLATFORM_BANK_NAME`,
  `PLATFORM_BANK_IBAN`, `PLATFORM_BANK_ACCOUNT`.
- On Heroku (whose `migration:run` predates the migrations table): run
  `heroku run node dist/database/apply-subscription-schema.js -a finmatrix-api-prod`.
- Screenshots are stored via the local `StorageService` (ephemeral on
  Heroku/Render — survives until redeploy). Swap to S3 for durable storage using
  the same `StoredFile` shape.
