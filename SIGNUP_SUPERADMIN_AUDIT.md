# SIGNUP + SUPER-ADMIN AUDIT (Phase 0)

Audit of the existing signup/approval flow and the FinMatrix Super-Admin (platform operator) view, per `Phase1.md`. **No code changed in this phase.** This report ends with the decisions needed before Phase A.

Repos: `FinMatrix` (RN/Expo/RTK) · `FinMatrix-Backend` (NestJS/TypeORM/PG, nested at `FinMatrix-Backend/FinMatrix-Backend`).

**Headline:** ~80% already exists and is wired to real endpoints. This is mostly reconciliation + gap-filling, not greenfield. There is **one critical correctness gap** (login is not gated on company approval server-side) and a **status-model mismatch** between what's in the code and what `Phase1.md` specifies.

---

## 1. Frontend — Auth / signup screens

| Screen | Renders | Wired to real endpoint | Gaps vs Phase1.md |
|---|---|---|---|
| `SignUpScreen` | ✅ | ✅ `POST /auth/signup` | Collects Full Name, Email, **Phone**, Password, Confirm. Spec says name/email/password — phone is extra (minor, harmless). |
| `EmailVerificationScreen` | ✅ | ✅ verify/resend code; auto-advances via `/auth/me` | Works. Server enforces `EMAIL_NOT_VERIFIED` for admins. Depends on SMTP being enabled on staging (see §4). |
| `CompanySetupScreen` | ✅ | intro/routing screen | Entry to onboarding; routes to CreateCompany. OK. |
| `CreateCompanyScreen` | ✅ | ✅ `POST /companies` | **Over-collects** vs "QuickBooks-minimal": companyName, industry, full address, phone, email, website, **taxId**, **+ a warehouse/agency selection step**. **Missing business structure (legal_structure)** which the spec explicitly wants. Needs trimming + one added field. |
| `SubscriptionSelectScreen` | ✅ | ✅ `GET /super-admin/plans/public`, `POST /companies/subscribe` | Renders plans from backend but shows **`$` (USD)** and names **Free/Starter/Professional**; **does not disable paid plans**. Spec wants **Rs**, **Free / Standard (Rs 1,000/6mo) / Pro (Rs 2,000/3mo)**, only Free selectable, paid **disabled** "Coming soon". |
| `PendingApprovalScreen` | ✅ | reads `companyStatus` | Renders; reached from BaseNavigator when `pending`/`pending_approval`. OK. |
| `CompanyRejectedScreen` | ✅ | reads reason | Renders; reached when `rejected`. Verify it displays `rejectionReason`. |
| `SignInScreen` | ✅ | ✅ `POST /auth/signin` | Works; relies on server gate (which is incomplete — see §4). |
| `authSlice` / `companySlice` | ✅ | ✅ | `user.companyStatus` + `isEmailVerified` threaded through. Solid. |

**Current signup navigation order** (`BaseNavigator.tsx`): unauthenticated → `RoleSelection` → `SignUp` → `EmailVerification`. After auth, routing is **status-driven**: `!emailVerified` → EmailVerification; `pending`/`pending_approval` → PendingApproval; `rejected` → CompanyRejected; `approved`/`active` → AdminTabs; `email_verified` draft company → SubscriptionSelect; else onboarding (`CompanySetup → CreateCompany → JoinCompany → SubscriptionSelect → AdminTabs`).
→ The flow ordering the spec wants (signup → verify → company → plan → pending) **already exists**; the gaps are field trimming, plan presentation, and the server login gate.

---

## 2. Frontend — Super-Admin view

Nav: `SuperAdminNavigator` = 5 bottom tabs → Dashboard, Companies, Analytics, Plans, Settings (all present). Reached via `BaseNavigator` when `user.role === 'super_admin'`.

| Screen | Renders | Wired to real endpoint | Gaps |
|---|---|---|---|
| `SuperAdminDashboardScreen` | ✅ | ✅ `loadPlatformStats` → `GET /super-admin/stats` | Real KPIs. Verify every card/quick-action navigates somewhere real (no dead tiles). |
| `CompanyManagementScreen` | ✅ | ✅ `loadCompanies` → `GET /super-admin/companies?status=`; `updateCompanyStatusLocal` → `PATCH /super-admin/companies/:id/status` (misnamed — it **does** call the server) | Has status filter, search, approve (→active), reject (→rejected reason), **suspend (→suspended)**. Uses **"Suspend/suspended"** terminology, not spec's **"deactivate/inactive"**. Confirm a **reactivate** path for suspended companies exists in the detail modal. |
| `RevenueAnalyticsScreen` | ✅ | ✅ `loadPlatformStats/loadPlans/loadSubscriptions` (rewritten to real data earlier) | Has a "coming soon"/empty marker. Confirm no residual mock chart. |
| `SubscriptionPlansScreen` | ✅ | ✅ plans CRUD endpoints | Should reflect count of companies per plan and present Free/Standard/Pro. Verify against new plan model. |
| `AdminSettingsScreen` | ✅ | partial | Contains "coming soon"/no-op markers — needs each action made functional or clearly disabled with a reason. |

**Verdict:** the Super-Admin view is substantially functional and server-wired. Phase B is finishing touches (terminology, reactivate action, settings no-ops, empty states), not a rebuild.

---

## 3. Backend — status model, plan field, endpoints, role

**Company entity (`companies`)** has: `status` (varchar, nullable), `submittedAt`, `rejectionReason`, `reviewedBy`, `reviewedAt`. **No `subscriptionPlan` field** — plans live in a separate `subscription_plans` + `company_subscriptions` system.

**Status values in play today (fragmented):** `unverified`, `email_verified`, `pending_approval`, `pending`, `approved`, `active`, `rejected`, `suspended` (Stage-1 state machine + legacy). `UpdateCompanyStatusDto` currently allows **`pending | active | suspended | rejected`**.
→ **Mismatch with Phase1.md**, which specifies a clean **`pending | active | inactive | rejected`** (i.e. `inactive` where the code says `suspended`, and it wants `pending` as the post-signup default rather than `email_verified`/`pending_approval`).

**Super-Admin endpoints (all under `/super-admin`, role-guarded server-side via inline `guardSuperAdmin(user)` → 403 for non-super-admin):**
- `GET /super-admin/stats` — platform KPIs (counts incl. pending, active, rejected).
- `GET /super-admin/companies?status=&page=&limit=` — **LIST incl. pending** ✅ (maps legacy `active`/`approved` and `pending`/`pending_approval`).
- `GET /super-admin/companies/:id` — detail.
- `PATCH /super-admin/companies/:id/status` `{status, rejectionReason?}` — **one generic endpoint** that covers approve/reject/activate/deactivate by setting status; sets `reviewedBy`/`reviewedAt`.
- Plans: `GET /plans`, `GET /plans/public`, `POST/PATCH/DELETE /plans/:id`. Subscriptions: `GET /subscriptions`, `POST /subscriptions`.
→ Phase1.md asks for granular `/admin/companies/:id/approve|reject|activate|deactivate`. Functionally the **generic status endpoint already does all four** and is wired end-to-end in the app.

**Super-admin role identity:** `user.role === 'super_admin'` (platform role, never overridden by company membership — verified in `auth.service.signin`). Enforced inline on every super-admin endpoint.

**Login gate (`auth.service.signin`) — CRITICAL GAP:** blocks only on `!user.isActive` (user flag) and `admin && !isEmailVerified` (403 `EMAIL_NOT_VERIFIED`). It **does NOT block by company approval status** — a `pending`/`rejected`/`inactive` company owner is still issued tokens; only the *frontend* routes them to Pending/Rejected screens. Phase1.md requires **login allowed only when company status = active, enforced server-side**. This is the #1 thing Phase A must add.

---

## 4. Gaps summary (what Phase A/B must actually do)

**Critical**
1. **Server-side login gate** on company status in `auth.service.signin`: block `pending`/`inactive`/`rejected` with the right code/message (frontend already routes on the returned `companyStatus`). *(Phase A)*
2. **Status model reconciliation** to `pending | active | inactive | rejected` (map/rename `suspended`→`inactive`, ensure new signups default to `pending`, keep legacy `active`/`approved` readable so **MetroMatrix and existing logins don't break**). *(Phase A)*

**Signup UX**
3. Trim `CreateCompanyScreen` to QuickBooks-minimal (name, industry/business type, **business structure**, invoice contact/address) and **add the missing business-structure field**; move the warehouse/agency step out of first-run signup (keep the feature elsewhere — hard constraint: don't remove features).
4. Re-present plans at signup in **Rs**, as **Free (selectable) / Standard Rs 1,000·6mo (disabled) / Pro Rs 2,000·3mo (disabled)**.

**Super-Admin polish (Phase B)**
5. Align terminology to **Deactivate/Inactive** (or keep `suspended` and just relabel in UI — decision below); ensure **Reactivate** action for inactive companies.
6. Make `AdminSettingsScreen` actions functional or explicitly-disabled; kill any residual mock in Analytics; confirm all dashboard tiles navigate.
7. Confirm loading/empty/error + pull-to-refresh on every list, and graceful server-error surfacing.

**Infra / verification**
8. Confirm **SMTP is enabled on staging** so the real verification code reaches `sp23-bcs-104@cuilahore.edu.pk` (Heroku had Gmail SMTP enabled previously — needs re-confirmation).
9. Add tests: login status gate (pending/inactive/rejected blocked) + approve/reject/activate/deactivate incl. non-super-admin 403. Keep `test/acceptance.ts` green.

---

## 5. DECISIONS NEEDED before I start Phase A

1. **Status enum:** adopt the spec's `inactive` (rename from `suspended`, updating the DTO + UI), or keep the DB value `suspended` and only relabel it "Inactive" in the UI? *(Recommend: keep DB `suspended`, add `inactive` as an accepted alias, label "Inactive" in UI — least risky, no data migration.)*
2. **Endpoints:** keep the working generic `PATCH /super-admin/companies/:id/status` (already wired), or additionally add the literal `/admin/companies/:id/approve|reject|activate|deactivate` routes from the spec? *(Recommend: keep generic; optionally add thin alias routes if you want the exact paths.)*
3. **`subscriptionPlan` on company:** add a `subscriptionPlan` enum column to `companies` (simple, matches spec), or derive the plan from the existing `company_subscriptions` table? *(Recommend: add the column — simpler and matches the spec's field list.)*
4. **Plans:** rename/reprice the seeded plans to **Free / Standard (Rs 1,000, 6 mo) / Pro (Rs 2,000, 3 mo)** and switch signup currency to **Rs**? This changes seeded plan data. Confirm the exact three and that paid ones are display-only for now.
5. **Signup minimization vs "don't remove features":** OK to **hide** taxId/website and the agency-selection step from first-run signup (keeping them available post-onboarding), and **add business structure**? Confirm the minimal field set.
6. **Staging target:** run the end-to-end test on the existing Heroku prod (`finmatrix-api-prod`) with SMTP on, or a separate staging DB? Confirm I can email `sp23-bcs-104@cuilahore.edu.pk` for real.

**Awaiting your answers on §5 before implementing Phase A.** Once confirmed I'll proceed in small per-phase commits (status model + login gate → signup flow → plan presentation → super-admin polish), keeping `tsc`/`build`/acceptance green and accounting untouched.
