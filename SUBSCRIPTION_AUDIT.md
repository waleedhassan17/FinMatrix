# SUBSCRIPTION_AUDIT.md — Phase 0 (phase2.md)

Audit of the current state of both repos before implementing the subscription
lifecycle (three flows + plan-based delivery-personnel gating + full accounting
on all plans). Goal: **reuse, not duplicate.** Paths:

- Frontend: `/home/muhammad-waleed-hassan/FinMatrix`
- Backend (nested): `/home/muhammad-waleed-hassan/FinMatrix-Backend/FinMatrix-Backend`
  (NestJS + TypeORM + Postgres, migrations-based, `synchronize` off, global
  `JwtAuthGuard` + `ThrottlerGuard`, response envelope + idempotency interceptors).

---

## 1. Account & subscription fields — what exists today

**`companies` table / `Company` entity** (`modules/companies/entities/company.entity.ts`)
- `status` (varchar, default `active`) — the **account status**. Fragmented
  historical values are normalized by `common/utils/company-status.util.ts`
  → `normalizeCompanyStatus()` → canonical `pending | active | inactive | rejected`.
  Login is allowed **only when active** (Phase 1 gate).
- `subscription_plan` (varchar, default `free`) — already added (migration
  `1783400000000`). Values `free | standard | pro`.
- `rejection_reason`, `reviewed_by`, `reviewed_at`, `submitted_at`, `setup_completed`.
- **MISSING (to add in Phase A):** `subscription_status`, `subscription_start_date`,
  `subscription_expiry_date`, `payment_status`, `last_submission_id`,
  `subscription_reminder_on` (for daily-reminder idempotency).

**`subscription_plans` + `company_subscriptions`** (`modules/super-admin/entities`)
- Legacy super-admin plan catalogue (Free/Starter/Professional/Enterprise, `Rs`
  monthly/yearly numeric) + per-company subscription rows. Used by the Super-Admin
  Plans/Analytics screens. **Not** the source of truth for the phase2 plan config
  and **not** reused for gating — kept intact so existing analytics keep working.

**Two concepts are already separate** and will stay separate:
- accountStatus = `companies.status` (normalized) → can the user log in?
- subscriptionStatus (NEW field) → is the plan current (`active|expiring|expired`)?

---

## 2. Existing signup / payment flow (submit → review → approve)

- **Signup:** `POST /auth/signup` (admin) → email verification gate
  (`EMAIL_NOT_VERIFIED`) → `POST /companies` (create) → `SubscriptionSelect` →
  `POST /companies/:id/submit` sets `status = pending_approval`.
- **Plan pick (frontend):** `SubscriptionSelectScreen.tsx` shows Free (selectable,
  backed by the real free plan) and Standard/Pro as **display-only "Coming soon"**.
  So the paid tiers are **not yet purchasable** — there is currently **no
  bank-transfer / screenshot-upload flow**. phase2's "reuse the existing manual
  bank-transfer flow" therefore has to be **built** (there is a close pattern to
  reuse — see §5).
- **Super-admin review:** `GET /admin/companies?status=`, `PATCH
  /admin/companies/:id/approve|reject|activate|deactivate`
  (`super-admin/admin-companies.controller.ts` → `SuperAdminService.updateCompanyStatus`,
  role-guarded via inline `guardSuperAdmin`). Approval emails the owner. This is a
  **company**-approval flow, not a **payment**-approval flow.
- **Login gate:** `auth.service.signin` throws `COMPANY_PENDING/INACTIVE/REJECTED`
  for non-active companies (super_admin + delivery exempt). `CompanyGuard`
  (`common/guards/company.guard.ts`) re-checks `companies.status` per business
  request → immediate lockout. **NOTE:** because signin *throws* for `inactive`,
  an expired account currently gets **no token** → it cannot reach any renew
  endpoint. Phase A must change this: `inactive` login should **succeed with a
  token** and route the app to a **renew-only** state, while `CompanyGuard` keeps
  blocking every business endpoint (billing endpoints will use `JwtAuthGuard`
  only, so they stay reachable).

**Platform bank account:** phase2 says it is "already configured" but no bank
details exist anywhere in code (only "Waleed Hassan" as the seeded super-admin
display name). It will be added as **server-side config** (`PLATFORM_BANK`):
Muhammad Waleed Hassan / Allied Bank / IBAN.

---

## 3. Company Settings screen

`src/screens/Settings/` = `SettingsMain`, `CompanyProfile`, `CompanySwitcher`,
`UserManagement`. Backend `modules/settings` (`GET/PATCH /settings`,
`/settings/company-profile`, `CompanyGuard`, admin-only). **No Subscription
section today** → Phase B adds one to `SettingsMain` (current plan, status,
expiry, "X of LIMIT delivery personnel used", always-available "Subscribe /
Change Plan").

---

## 4. Delivery-personnel create/manage screens + endpoints

- **Backend:** `modules/delivery-personnel` — `POST /delivery-personnel`
  (`create()`: makes a `users` row role `delivery` + `user_companies` membership +
  `delivery_personnel_profile` status `active`, all in one tx), `GET
  /delivery-personnel` (list, paginated), `GET/PATCH/:userId`,
  `PATCH /location`, `POST /:userId/reset-password`. **No limit enforcement today.**
- **Frontend:** `src/screens/Delivery/Personnel/` (List / Add / Detail).
  `network/deliveryNetwork.ts` `getDeliveryPersonnelAPI` / `createDeliveryPersonnelAPI`.
  Also called from onboarding via `authNetwork.registerAdminCreatedPersonnel`.
- **Phase A adds:** server-side limit (Free = 1, paid = 3) in `create()` +
  `GET /billing/plan-limits` (plan, limit, current count). **Phase B adds:** "X of
  LIMIT used" + disabled "Add" with an upgrade prompt at the limit. Over-limit
  after a downgrade **keeps** existing personnel (never deletes) and only blocks
  new creation.

---

## 5. File-upload + notification mechanisms to reuse

- **Uploads:** `common/storage/StorageService.putBuffer()` (writes
  `<bucket>/yyyy/mm/<uuid>.<ext>`, returns key + auth-gated URL). The
  **bill-photo** controller (`modules/inventory-approvals/bill-photo.controller.ts`)
  is the exact reusable pattern: `FileInterceptor('photo')`, 8 MB limit, JPEG/PNG/WebP.
  Phase A reuses `StorageService` for the payment **screenshot** and adds an
  auth-gated stream endpoint for the super-admin review screen.
  ⚠️ Heroku/Render FS is ephemeral — screenshots survive until the next redeploy
  (documented; S3 is the production upgrade, same `StoredFile` shape).
- **Notifications:** `modules/notifications` — `Notification` entity +
  `NotificationsService.create()` exist and are used internally by deliveries /
  inventory-approvals. The **controller was removed** in the v1 scope (no
  `GET /notifications`). Phase A re-adds a minimal read controller (list + unread +
  mark-read) so the daily renew reminders show in-app; the reminder rows are
  created by the cron.
- **Scheduling:** `@nestjs/schedule` is a dependency but **`ScheduleModule` is not
  registered** anywhere and there is no `@Cron`. Phase A registers
  `ScheduleModule.forRoot()` and adds a daily billing cron (idempotent) + a
  super-admin manual-trigger endpoint for testing.

---

## 6. Plan config (phase2 source of truth — to add server-side)

`modules/billing/plan-config.ts` (single source of truth, minor units = paisa):

| plan | priceMinorUnits | durationMonths | deliveryPersonnelLimit |
|------|-----------------|----------------|------------------------|
| free | 0 | null | 1 |
| standard | 100000 (Rs 1,000) | 6 | 3 |
| pro | 200000 (Rs 2,000) | 3 | 3 |

All accounting features stay available on **every** plan (no accounting gating is
added anywhere). The only plan difference enforced is the delivery-personnel limit.

---

## 7. Plan for the three flows (reuse map)

- **FLOW 1 (signup + plan):** keep `SubscriptionSelect`; a paid pick routes into
  the new shared pay→upload flow (NEW submission). Free stays instant.
- **FLOW 2 (renewal on expiry):** login now succeeds for `inactive` → app shows a
  **renew-only** `RenewSubscription` screen → shared pay→upload flow (RENEWAL).
- **FLOW 3 (upgrade from Free / change plan):** Settings → Subscription section →
  same shared pay→upload flow (UPGRADE).
- **Shared backend:** one `billing.service.approveSubmission()` runs the same
  activation for all three; one `platform_revenue` row per `submissionId`
  (idempotent). Revenue is **platform** revenue — never posted to company books
  (no JE, accounting engine untouched).

**Conclusion:** account/subscription split, upload pattern, notification service,
super-admin role-guard, and delivery-personnel create all exist and are reused.
New work = subscription fields + PLAN_CONFIG + billing module (submissions +
approval + revenue) + limit enforcement + expiry cron + the inactive-can-renew
login change + the three FE flows.
