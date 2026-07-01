# Phase 1 — Signup + Super-Admin: CHANGELOG

Implements `Phase1.md` (QuickBooks-style signup + approval flow, and a fully-functional FinMatrix Super-Admin view). Accounting/posting logic untouched. See `SIGNUP_SUPERADMIN_AUDIT.md` for the Phase-0 audit.

## Account-status model (single source of truth = backend)
Canonical model: **`pending | active | inactive | rejected`**. A new `normalizeCompanyStatus()` maps the historical/legacy values onto it so existing companies keep working:
- `active` / `approved` / `null` → **active**
- `email_verified` / `pending_approval` / `pending` / `unverified` → **pending**
- `suspended` / `inactive` → **inactive**
- `rejected` → **rejected**

Login is allowed ONLY when active. Enforced server-side in two places (defense in depth):
1. `auth.service.signin` blocks non-active companies with a specific code (`COMPANY_PENDING` / `COMPANY_INACTIVE` / `COMPANY_REJECTED`, plus the rejection reason) so the client routes to the right screen.
2. `CompanyGuard` re-checks the company status on **every** business endpoint (lightweight indexed lookup) → deactivation takes effect immediately, even for an already-issued token (`COMPANY_NOT_ACTIVE`, 403).

New company field: `companies.subscription_plan` (`free | standard | pro`, default `free`) — migration `1783400000000`.

## Super-Admin endpoints (role-guarded server-side; non-super-admin → 403)
- **New granular contract** (`admin-companies.controller.ts`): `GET /admin/companies?status=`, `GET /admin/companies/:id`, `PATCH /admin/companies/:id/approve | /reject | /activate | /deactivate`.
- **Kept** the pre-existing generic `PATCH /super-admin/companies/:id/status` (already wired end-to-end in the app) and `GET /super-admin/{stats,companies,companies/:id}`, plans + subscriptions.
- `UpdateCompanyStatusDto` now accepts `inactive` (`suspended` kept as alias); the status service maps `active → approved`, `suspended → inactive`, and requires a reason on reject.
- `getAllCompanies` / `getPlatformStats` status buckets updated so `inactive` covers `inactive+suspended` and `pending` covers the draft states.

## Wired vs newly built (frontend)
Most screens already existed — this was mostly wiring + gap-filling:
- **Newly built:** `normalizeCompanyStatus` util + `company-status.util`; `admin-companies.controller`; the login-gate branches in `auth.service`/`CompanyGuard`; the `subscription_plan` column + migration; the deactivate/reactivate handlers + status-driven action set in the Super-Admin company modal; the Business Structure field in CreateCompany; the canonical Rs plan cards; `test/auth-gate.acceptance.ts`.
- **Wired / fixed:** `authNetwork` + `signInSlice` now preserve and surface the login-gate codes/reason (via `rejectWithValue`); `SignInScreen` routes `COMPANY_PENDING/INACTIVE/REJECTED` to Pending/Rejected screens; `PendingApproval` + `CompanyRejected` added to the unauthenticated stack and made to work without a session (`fromLogin` mode; Rejected handles `inactive`/deactivated); `BaseNavigator` routes mid-session `inactive` out; the Super-Admin company modal's broken "Suspend" (which wrongly triggered reject) replaced with proper Deactivate/Reactivate; status filter "Suspended" → "Inactive".

## Signup flow (unchanged order, tightened content)
signup → email verify → company (name, industry, **business structure**, invoice contact/address) → plan → pending → (super-admin approve) → active.
- Plans at signup: **Free** (selectable, backed by the real free plan) / **Standard Rs 1,000 · 6 months** (disabled, "Coming soon") / **Pro Rs 2,000 · 3 months** (disabled). Rs currency.
- CreateCompany adds the missing **Business Structure** (`legal_structure`) to the form + `POST /companies` payload. (The multi-step warehouse/agency selection remains a step — kept per the "don't remove features" constraint; it is optional and the feature also lives under More → Agencies.)

## Verification
- `npx tsc --noEmit` clean in **both** repos; backend `npm run build` succeeds.
- **`npm run test:authgate` → 10/10 passing** live against prod (`finmatrix-api-prod`), covering: active login works; non-super-admin → 403 on `/admin/companies`; super-admin lists companies; **deactivate → login blocked (`COMPANY_INACTIVE`) + existing session blocked (`COMPANY_NOT_ACTIVE`) → reactivate → login restored.** The test is non-destructive (leaves the company active).
- Accounting acceptance suite (`test:acceptance`) is unaffected — no posting/ledger code was touched; run it against a test Postgres to avoid polluting demo data.

## Owner's manual staging step (requires the real email code)
Run the full signup on the app with `sp23-bcs-104@cuilahore.edu.pk` and company **"Sukoon"** (email verification needs the code delivered to that inbox), see it appear as **Pending** in the Super-Admin → Companies view, **Approve** it, log in as that owner, then **Deactivate** and confirm login is blocked. All server mechanics for this are verified above.

## Deploy
Backend deployed to Heroku `finmatrix-api-prod` (migration auto-runs on boot); both repos pushed to origin/main.
