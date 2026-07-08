# TIERING_AUDIT.md — Phase 0 audit for the three-tier product (FinMatrix.md)

**Date:** 2026-07-08 · **Scope:** FinMatrix (RN + Expo + Redux Toolkit) and FinMatrix-Backend (NestJS + TypeORM + PostgreSQL)
**Method:** every conclusion below comes from opening the named file, not from folder names.

> ⚠️ **Missing reference doc:** `FinMatrix_Tier_Feature_Guide.md` is NOT in either repo (searched
> case-insensitively across the home directory). This audit uses FinMatrix.md's own "THE MODEL"
> section as the authoritative checklist — it is detailed enough to be unambiguous. If the guide
> contains anything beyond THE MODEL (e.g. the registration-card bullet copy), please drop the file
> into the repo before Phase 2; only the marketing copy on the three type cards depends on it.

---

## 1. Existing-feature inventory (module by module)

Verdicts: **FULL** = exists and works end-to-end · **PARTIAL** = exists, needs additions · **ABSENT** = genuinely not in the codebase.

| Module | Backend (file-verified) | Frontend (file-verified) | Verdict |
|---|---|---|---|
| **Invoices** | `modules/invoices` — full posting via shared `PostingService`; void w/ reversal; idempotency keys. **`postInvoiceCogs` skips lines with no `itemId`** (`invoices.service.ts` — `if (!line.itemId) continue;`), so service-only invoices already post revenue with NO COGS/inventory and balance. FinMatrix.md Phase 1 §5 safeguard **already exists**. | `screens/Invoices` (List/Form/Detail) in `TransactionsStack` | FULL |
| **Bills / expenses** | `modules/bills` (+`bill-payments` routes) — DR expense / CR A/P, payment flow | `screens/Bills`, `PayBills` in `TransactionsStack` | FULL |
| **Payments** | `modules/payments` — receive, applications, auto bank-account default, customer credit | `ReceivePayment` in `TransactionsStack` | FULL |
| **Customers / Vendors** | `modules/customers`, `modules/vendors` — paginated, sub-resources (invoices/payments/bills/statement) | `screens/Customers`, `screens/Vendors` in `MoreStack` | FULL |
| **Chart of Accounts** | `modules/accounts` — system accounts (`accounts.constants.ts`), guards on delete | `COAList/Form/Detail` in `MoreStack` | FULL |
| **Tax** | `modules/tax` — rates, payments (DR 2300 / CR cash) | `TaxSettings/TaxLiability/TaxPayment` in `MoreStack` | FULL |
| **Estimates** | `modules/estimates` — create/status/convert-to-invoice-or-SO | `EstimateList/Form/Detail` in `TransactionsStack` | FULL |
| **Sales Orders / Credit Memos / Vendor Credits / General Journal / Bank Reconciliation** | `modules/sales-orders`, `credit-memos`, `vendor-credits`, `journal-entries` (manual JE controller), `reconciliations` | all registered in `TransactionsStack` / `MoreStack` | FULL (not named in THE MODEL — need a tier decision, see §8 Q3) |
| **Reports** | `modules/reports` — P&L, Balance Sheet, Trial Balance, Cash Flow, AR aging, Inventory Valuation, delivery reports; `modules/ledger` — General Ledger | `ReportsStack` (14 routes incl. hub) | FULL |
| **Payroll** | `modules/payroll` — employees CRUD + runs + `process` posts DR 6200 Salary Expense / CR Cash / CR 2300 (verified `payroll.controller.ts`, all `@Roles('admin')`) | `EmployeeList/Form`, `PayrollRunList/Detail` in `MoreStack` | FULL |
| **Employees** | part of `modules/payroll` (`entities/employee.entity.ts`) | same screens | FULL |
| **Budgets** | `modules/budgets` — CRUD + `GET /:id/vs-actual` (actual = net GL movement per account) | `BudgetList/Form/Detail` in `ReportsStack` | FULL |
| **Multi-user roles** | Membership role stored per company (`user-company.entity.ts` `role: UserRole`); `GET /settings/users` + `POST /settings/users/invite` (settings.controller.ts:97,140); `RolesGuard` enforces per-endpoint `@Roles(...)`. **Role vocabulary is only `admin | staff | delivery`** — no Accountant/Approver/Viewer, no permission matrix. | `UserManagementScreen` (invite modal, `fetchUsers`) | PARTIAL — invite/list/enforce exist; the 4-role matrix is new |
| **Approval workflows (bills/expenses over threshold)** | no hits for threshold/approval in `bills.service.ts` or anywhere else | none | **ABSENT** |
| **Audit log** | `common/audit/` — `OperationalAuditModule` + `operational_audit_events` (rider resets, deactivations, etc.) + `inventory-approval-audit-entry`. **No general accounting audit trail** (invoice created/voided by whom) and no export. | old `AuditTrail` screen was deleted in the v1 scope cut — no screen today | PARTIAL — infra exists, coverage + screen are new |
| **Period close** | `companies.books_locked_until` column exists AND is enforced **centrally in `PostingService`** (`PERIOD_LOCKED`, posting.service.ts:69-75) — locked-period posting already 400s (acceptance test #16 proves it). **No endpoint/UI to set the lock, no reopen-with-logged-reason.** | none | PARTIAL — engine done; management endpoint + screen + reopen-audit are new |
| **Inventory** | `modules/inventory` — SKU, weighted-average costing, movements, adjustments, reorder points | `InventoryStack` (List/Form/Detail/Adjustment/PhysicalCount/StockTransfer) | FULL |
| **Purchase Orders → GRNI 3-way match** | `modules/purchase-orders` — receive posts **DR Inventory / CR GRNI 2050** (`purchase-orders.service.ts:163`, `ACCT_GRNI` in accounts.constants.ts), create-bill clears GRNI | `POList/Form/Detail` in `TransactionsStack` | FULL |
| **Deliveries (states + GL linkage)** | `modules/deliveries` + `delivery-ledger.service.ts` — Assign → Dr 1250 GIT / Cr 1200; approve → Dr Cash-or-A/R / Cr Revenue + Dr COGS / Cr GIT; return/cancel → reversal + restock. **E2E-verified yesterday (phase2.md): 135/135 acceptance + GIT-nets-to-zero asserted.** | admin: `CreateDelivery`, `AssignDeliveries`, `DeliveryMonitor`, `InventoryApproval`, … | FULL |
| **Delivery-personnel portal** | distinct `delivery` role; scoped list (`personnelId = user.id`); 403 on every financial endpoint (verified in yesterday's D10 sweep) | **`DeliveryTabNavigator`** + 4 DP stacks — already a completely separate navigator with zero accounting routes | FULL — Phase 1 §6 and the `DeliveryPersonnelNavigator` of Phase 3 **already exist** |
| **Shadow inventory** | `modules/shadow-inventory` + snapshots updated on POD | `DPInventoryStack` | FULL |

## 2. Registration/onboarding + existing plan/subscription infrastructure

Flow today (all file-verified in `BaseNavigator.tsx` + `screens/Auth/*`):
`RoleSelection → SignUp → EmailVerification → CompanySetup → CreateCompany | JoinCompany → SubscriptionSelect → SubscriptionPay (bank-transfer screenshot) → PendingApproval → super-admin approves → AdminTabs`. Renewal (`RenewSubscription`/`SubscriptionPay`) and mid-session deactivation routing exist.

Plan infrastructure (this is the big reuse win):
- **`modules/billing/plan-config.ts`** — a single server-side `PLAN_CONFIG` already exists (keys `free | standard | pro`, minor-units PKR, `durationMonths`, per-plan `deliveryPersonnelLimit`, currency as data). The six-plan model **replaces the key set in this one file** — exactly the "single source of truth" FinMatrix.md asks for.
- `modules/billing/` — `billing.controller.ts` (`/status`, `/plan-limits`, `/bank-details`, `/submit`, `/submissions`, screenshot bytea), `billing-cron.service.ts` (expiry → `inactive`, reminders), `billing-admin.controller.ts` (approve/reject payment). Company provisioning on approval exists.
- `companies` table already has `subscription_plan`, `subscription_status`, `subscription_start_date`, `subscription_expiry_date`, `payment_status`, `last_submission_id` (company.entity.ts:98-119).
- FE `SubscriptionSelectScreen` currently lists plans via `getPublicPlansAPI` + `selfSubscribeAPI` (super-admin plan entities) — the older of the two plan systems; the billing module is the newer one. Phase 2 should converge the select screen onto the billing PLAN_CONFIG (see §8 Q2).

## 3. Current navigation structure (exact tree)

```
BaseNavigator (native stack, src/navigators/BaseNavigator.tsx) ← THE single root switch, already exists
├─ unauthenticated: Onboarding → RoleSelection → SignIn/SignUp/ForgotPassword/EmailVerification (+PendingApproval/CompanyRejected)
├─ role super_admin  → SuperAdminNavigator (5 tabs)
├─ role delivery     → DeliveryTabNavigator (DPDashboard/DPDeliveries/DPInventory/DPProfile stacks) ← the DP portal
├─ admin, gates: !emailVerified → EmailVerification · pending → PendingApproval · inactive → Renew-only ·
│                rejected → CompanyRejected · draft → SubscriptionSelect
└─ admin approved    → AdminTabNavigator (bottom tabs)
     ├─ DashboardStack     (11 routes: AdminDashboard + delivery-ops screens + InventoryApproval + GlobalSearch)
     ├─ TransactionsStack  (27 routes: invoices, estimates, SOs, credit memos, vendor credits, payments,
     │                      bills, PayBills, POs, journal entries)
     ├─ ReportsStack       (14 routes: hub, P&L, BS, TB, CashFlow, GL, Budgets×3, ARAging, InventoryValuation,
     │                      Analytics, delivery reports×2)
     ├─ InventoryStack     (6 routes)
     └─ MoreStack          (40 routes: employees/payroll, COA, agencies, customers/vendors, delivery ops
                            (duplicated registrations), personnel mgmt, bank rec, tax, settings incl.
                            UserManagement, renew flow)
```
Nothing inside AdminTabNavigator is currently conditional — every admin sees everything. Navigation decisions happen in exactly one file (`BaseNavigator.tsx`), which is precisely where the tier switch belongs. Dashboard is a single `AdminDashboardScreen` component (widget-based, suitable for flag-driven widgets per Phase 3 §4).

## 4. Current company/account model (backend)

- `companies` (company.entity.ts): name, industry, settings jsonb, status state-machine (`unverified…approved/rejected/inactive`), invite_code, subscription fields (§2), `books_locked_until`, `sales_tax_registered`. **No `companyType`, no feature flags, no kill switch.**
- `user_companies`: userId + companyId + `role` (`admin|staff|delivery`) — membership roles per company already exist.
- `users`: email verification fields, `defaultCompanyId`.
- Billing entities: `subscription-plan`/`company-subscription` (legacy super-admin pair) + `payment-submission`, `platform-revenue` (billing module).
- Migrations are additive-by-convention (`src/database/migrations/*`, plus `apply-*-schema.js` scripts for Heroku since `migration:run` history is broken there — the same pattern must be used for the tiering migration).
- JWT payload: `{ sub, companyId, role }`; `/auth/me` returns user + companyStatus. Feature flags should ride on `/auth/me` + a `CompanyGuard`-attached record, **never** in the JWT body (flags change without re-login).

## 5. Proposed placement of the new pieces (following existing conventions)

| New piece | Where | Convention it follows |
|---|---|---|
| `company_type` (`small_business\|large_org\|warehouse`), `inventory_enabled` (bool, large-org toggle), `all_features_unlocked` (bool, kill switch) | additive columns on `companies` via migration `1783750000000-CompanyTiering.ts` + `apply-tiering-schema.js` for Heroku | company.entity.ts snake_case columns; nullable/defaulted |
| `FEATURE_MAP` + `FeatureGuard` + `@RequiresFeature('delivery' \| 'payroll' \| …)` decorator | new `src/common/features/` (feature-map.ts, feature.guard.ts, requires-feature.decorator.ts) | mirrors `common/guards/roles.guard.ts` + `common/decorators/roles.decorator.ts` |
| Six-plan `PLAN_CONFIG` | **edit `src/modules/billing/plan-config.ts` in place** — replace the 3 keys with the 6 type-scoped keys (PKR minor units), add `companyType` per plan; keep `formatMinorUnits`, bank details, limit helpers | it is already the declared single source of truth |
| Feature flags to the client | extend `/auth/me` + signin response (`companyType`, `features`, `allFeaturesUnlocked`) | same as `companyStatus` was added in Stage 1 |
| FE feature state | extend existing `companySlice`/auth slice; selector `selectFeatures` | existing slice pattern |
| Per-tier navigators | new `src/navigators/tiers/SmallBusinessNavigator.tsx`, `LargeOrgNavigator.tsx`, `WarehouseNavigator.tsx` — each a bottom-tab navigator (the app's existing pattern, allowed by Phase 3 §1) with its own per-tier stack route lists; `DeliveryPersonnelNavigator` = the existing `DeliveryTabNavigator` unchanged. `BaseNavigator` picks one by `companyType`+role. | mirrors `AdminTabNavigator` + `stacks/` structure |

**Kill switch (documented here per SAFETY §4):** `companies.all_features_unlocked` (default false). `FeatureGuard` checks it FIRST and short-circuits to allow. Flip per-company in seconds without deploy:
`UPDATE companies SET all_features_unlocked = true WHERE id = '<companyId>';`
(prod: `heroku pg:psql -a finmatrix-api-prod` then the same SQL; also exposed as super-admin endpoint `PATCH /super-admin/companies/:id/feature-override`). Global escape hatch: env `FEATURES_DISABLED=true` on the dyno makes the guard a no-op app-wide (config restart, no deploy).

**Backup command (SAFETY §2)** — to run and confirm before the Phase 1 migration:
- local/staging: `docker exec finmatrix-postgres pg_dump -U finmatrix_user -Fc finmatrix > backups/finmatrix-$(date +%F).dump`
- production: `heroku pg:backups:capture -a finmatrix-api-prod` (verify with `heroku pg:backups -a finmatrix-api-prod`)

## 6. File-by-file change list

**MODIFY (existing file, small targeted diff)** — the vast majority:

Backend: `companies/entities/company.entity.ts` (+3 columns) · `billing/plan-config.ts` (six keys) · `billing/billing.service.ts` + `billing.controller.ts` (plan validation by companyType; provisioning sets expiry from plan) · `billing/dto` (plan key enum) · `auth/auth.service.ts` (+`companyType/features` in AuthResult/me) · `companies/companies.service.ts` + dto (accept companyType at create) · `super-admin.service.ts` (approve → provision features; feature-override endpoint) · **controller-level guard lines only** on: `deliveries`, `delivery-personnel`, `inventory-approvals`, `shadow-inventory`, `inventory`, `purchase-orders`, `agencies`, `payroll`, `budgets` controllers (one `@RequiresFeature(...)` per class) · `settings.controller.ts` (multi-user gating) · seeds (`super-admin-seed.ts` demo wiring).

Frontend: `BaseNavigator.tsx` (root switch by companyType) · auth/company slice + serializer (+features) · `SubscriptionSelectScreen` (two plan cards from billing config; today it lists legacy plans) · `CreateCompanyScreen` (navigate via new type step) · `AdminDashboardScreen` (flag-driven widgets) · `MoreHub`/`TransactionsHub`/`reportsHubSlice` menus (feature-filtered rows) · `types` (RootStackParamList).

**NEW (genuinely doesn't exist today)** — the short list:

Backend: `common/features/feature-map.ts` + `feature.guard.ts` + `requires-feature.decorator.ts` · migration `1783750000000-CompanyTiering.ts` + `apply-tiering-schema.js` · approval-workflow (bills threshold) module *if kept in scope, see §8 Q4* · period-close endpoint (`PATCH /companies/:id/period-lock` + reopen-reason audit event — engine already enforces) · accounting audit-event coverage (emit events from existing controllers into the existing OperationalAudit infra) · seeds for Sukoon + Warehouse Co · Phase 5 test file `test/tiering.acceptance.ts`.

Frontend: `screens/Auth/CompanyTypeSelect` (three cards) · `navigators/tiers/{SmallBusiness,LargeOrg,Warehouse}Navigator.tsx` (+ slim per-tier stack route lists that import existing screens) · Audit Log screen (reuses ReportUI kit) + Period Close screen · Team & Roles additions to UserManagement (4-role vocabulary) *if kept in scope, see §8 Q4*.

## 7. Risk areas + how gating avoids them

1. **The posting engine is never touched.** `PostingService`, `invoices.service`, `payroll process`, `delivery-ledger.service` keep zero feature logic. `@RequiresFeature` sits at the controller class boundary (same plane as `RolesGuard`), so a gated company simply never reaches the service. Trial Balance/Balance Sheet invariants re-asserted by the existing suites after every phase.
2. **Existing production companies must not lose access.** MetroMatrix (the only real prod company) actively uses deliveries — the migration defaults existing rows to `company_type = 'warehouse'` (not large_org; the audit shows their access includes delivery), so behavior is bit-identical before/after. New gating only bites companies created after Phase 2.
3. **Legacy plan keys** (`free/standard/pro`) remain accepted by `normalizePlan` until renewal; expiry/renew cron untouched. No existing subscription row is rewritten.
4. **Small-business invoices**: engine-side already safe (no itemId → no COGS). FE `InvoiceForm` hides the inventory-item picker behind the feature flag (small prop change, not a rewrite).
5. **Rider portal**: already fully isolated (separate navigator + server 403s, E2E-proven) — Phase 1 §6 / Phase 3 DeliveryPersonnelNavigator are verification work, not construction.
6. **Duplicate route registrations** (delivery screens registered in both DashboardStack and MoreStack) — per-tier stacks must include each shared screen once per stack as today; no route-name collisions across tiers because only one navigator mounts at a time.
7. **Heroku migration quirk**: `migration:run` history is broken on prod — ship the idempotent `apply-tiering-schema.js` (same pattern as chunk1/phase1) and run it via `heroku run`.

**Per-phase rollback (SAFETY §5):**
- Phase 1: migration down-script drops the 3 columns + `git revert` of the phase commits; guard files are additive (deleting them restores today exactly). Kill switch env `FEATURES_DISABLED=true` is the instant non-deploy rollback.
- Phase 2: revert FE commits; backend accepts-but-ignores `companyType` on create (nullable column), so an old app build keeps working.
- Phase 3: revert FE commits — `AdminTabNavigator` is kept intact as the warehouse/legacy navigator, so reverting the switch restores today's UX.
- Phase 4: seed script wipes only the three named demo companies (idempotent, like `metromatrix.seed.ts` does today).
- Each phase = its own small commits (as with phase1/phase2 work), so `git revert <range>` per phase is clean.

## 8. Decision points for review (answer before Phase 1)

1. **Existing-company default**: I recommend `warehouse` for pre-tiering companies (MetroMatrix demonstrably uses deliveries). FinMatrix.md guessed large_org — confirm warehouse is acceptable.
2. **Two plan systems**: legacy super-admin plans (`getPublicPlansAPI`/`selfSubscribeAPI`) vs the newer billing PLAN_CONFIG flow. I propose Phase 2 converges the select screen onto the billing flow and the six-plan config, leaving legacy plan entities read-only for history. Confirm.
3. **Modules THE MODEL doesn't mention** (estimates ARE mentioned; but sales orders, credit memos, vendor credits, manual journal entries, bank reconciliation, agencies aren't): my proposal — small business gets estimates + manual JEs only; credit memos/vendor credits everywhere (they're accounting corrections); sales orders + agencies = warehouse; bank reconciliation = large_org+. Confirm or adjust.
4. **Scope check on the two genuinely-new feature builds**: the 4-role permission matrix (Accountant/Approver/Viewer) and the bills-over-threshold approval workflow are the only sizeable net-new features in the project (everything else is gating/reorg). Build both in this pass, or ship tiers first and add these as a follow-up? (They gate cleanly behind `multiUser`/`approvals` flags either way.)
5. **MetroMatrix demo conflict**: Phase 4 re-casts MetroMatrix as the LARGE ORG demo (no deliveries) and moves the delivery world to "Warehouse Co" — that means reseeding MetroMatrix without riders/deliveries and moving saim/haseeb-style riders to warehouse@gmail.com's company. Confirm you're OK changing the current demo data this way.

— END OF PHASE 0 — stopping for review as instructed. No code has been changed.

---

## 9. Post-audit outcome (Phases 1–5 executed after approval)

User approved with: three views per tier; **no GitHub push / no deploy** (all work local commits
only, migration run against the local/staging DB only — production untouched). Decisions taken per
the recommendations in §8: existing companies default `warehouse`; plan-select converged onto the
billing flow; module placement per §8 Q3; the 4-role matrix + bills-approval-workflow deferred as a
gated follow-up (flags `multiUser`/`auditLog`/`periodClose` exist and gate today's screens).

**Delivered:** `FeatureGuard` + `FEATURE_MAP` + `@RequiresFeature` on 17 controllers (posting
engine untouched); additive `CompanyTiering` migration (up + down verified on a scratch DB;
Heroku-safe `apply-tiering-schema.js` ready); six-plan `PLAN_CONFIG` (PKR, 6-month cheaper);
type-selection registration + two plan cards + signup payment flow; per-tier navigators
(SmallBusiness / LargeOrg / AdminTab-as-Warehouse / existing DP portal) behind the single
`BaseNavigator` switch with feature-filtered hubs and dashboard; `seed:tier-demos` (three demo
companies through the real ledger — ALL TIES HOLD); `test:tiering` acceptance **80/80**.

**Extra defects found & fixed by the new suite:** riders could READ financial data (8 financial
controllers had undecorated GET routes — now class-level `@Roles('admin','staff')`); fresh-signup
JWTs (no companyId yet) couldn't reach `/billing/*` (now resolves the caller's own membership);
`platform_payment_submissions.plan` / `platform_revenue.plan` were varchar(16), too short for tier
plan keys (widened to 32 in entity + migration + apply script).

**Verification (all local):** tiering 80/80 · acceptance 135/135 (now runs on the Warehouse Co
demo) · delivery-ledger 83/83 · chunk2 89/89 · chunk1 58/58 · jest 31/31 · `tsc --noEmit` clean
both repos · backend builds. Kill switch exercised live (unlock → 200s, revert → 403s). Rollback:
migration down-script tested; each phase is its own commit range.

**Still open before any production rollout:** run `heroku pg:backups:capture`, deploy, run
`apply-tiering-schema.js`, re-run `seed:tier-demos` there if demo data is wanted, and (optional
follow-up) build the Accountant/Approver/Viewer matrix + bills-over-threshold approvals behind the
existing flags. Credentials for everything seeded: `CREDENTIALS.md`.
