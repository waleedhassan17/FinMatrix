Work across both repos: FinMatrix (React Native + Expo + Redux Toolkit) and FinMatrix-Backend
(NestJS + TypeORM + PostgreSQL). Complete TWO things: (A) a QuickBooks-style signup +
admin-approval flow, and (B) a fully functional FinMatrix SUPER-ADMIN (platform operator) view —
the account that reviews signups, approves/rejects/activates/deactivates companies, and manages
plans. This is NOT the company-owner dashboard. Most screens already exist — this is mostly
wiring, verifying, and filling gaps, NOT building from scratch. Audit first, implement in phases,
commit per phase.

HARD CONSTRAINTS
- Do NOT change accounting/posting logic or remove features. Enforce ALL rules server-side.
- Derive companyId/role from the JWT, never from the client. `npx tsc --noEmit` clean in both
  repos. Keep the existing visual design system. Keep the QuickBooks signup MINIMAL (see below).

=======================================================================
PHASE 0 — AUDIT (produce SIGNUP_SUPERADMIN_AUDIT.md, then STOP for my review)
=======================================================================
These already exist — report each one's current state and wiring:
Auth (frontend): SignUpScreen, EmailVerificationScreen, CreateCompanyScreen/CompanySetupScreen,
SubscriptionSelectScreen, PendingApprovalScreen, CompanyRejectedScreen, SignInScreen, authSlice,
companySlice.
Super-Admin (frontend): SuperAdminNavigator, SuperAdminDashboardScreen,
CompanyManagement/CompanyManagementScreen, Analytics/RevenueAnalyticsScreen,
SubscriptionPlans/SubscriptionPlansScreen, AdminSettings/AdminSettingsScreen.
For each screen: does it render, is it wired to a real endpoint, and what's missing (dead buttons,
mock data, unreachable, missing endpoint)? Map the current signup navigation order. On the backend,
report whether the company/user entity has an account STATUS field and a subscription/plan field,
and whether endpoints exist to LIST pending companies and APPROVE / REJECT / ACTIVATE / DEACTIVATE
them, and how the "super admin" role is identified. Output the report, then proceed.

=======================================================================
PHASE A — QUICKBOOKS-STYLE SIGNUP + APPROVAL FLOW
=======================================================================
Implement this exact order (reuse the existing screens; wire them into this sequence):
1. SIGN UP (existing first page is fine): name, email, password. Test with email
   sp23-bcs-104@cuilahore.edu.pk (I'll verify from my phone).
2. EMAIL VERIFICATION: send a code to the email; user enters it; cannot be bypassed. Flow continues
   only after verifying.
3. COMPANY NAME + DETAILS (QuickBooks-style, MINIMAL): "What's your business called?" → company name
   (use "Sukoon" when I test), plus ONLY industry/business type, business structure, and the
   contact/address that appears on invoices. Collect nothing more.
4. SUBSCRIPTION PLAN — three cards:
   - Free — available now, selectable.
   - Standard — Rs 1,000/month for 6 months — rendered but DISABLED ("Coming soon").
   - Pro — Rs 2,000 for 3 months — rendered but DISABLED ("Coming soon").
   Only Free is selectable right now.
5. ACCOUNT REVIEW / PENDING: after choosing a plan, create the account with status = "pending" and
   submit the signup to the FinMatrix Super-Admin for review. Show PendingApprovalScreen. The user
   CANNOT log in yet.
6. On Super-Admin approval → status "active" → user can log in and reach their company dashboard.
   On rejection → status "rejected" → CompanyRejectedScreen with the reason.

ACCOUNT STATUS MODEL (backend = single source of truth on the company/account):
- status enum: "pending" (default), "active", "inactive", "rejected".
- Login allowed ONLY when status = "active"; pending/inactive/rejected are blocked with the correct
  message and routed to PendingApproval or CompanyRejected.
- Add fields: subscriptionPlan ("free"|"standard"|"pro"), reviewedBy, reviewedAt, rejectReason.
- Endpoints (SUPER-ADMIN only, role-guarded server-side; never trust client-sent status):
  GET /admin/companies?status=pending (+ all), PATCH /admin/companies/:id/approve,
  /reject (reason), /activate, /deactivate.

ACCEPTANCE (Phase A)
- [ ] Flow runs in order: signup → email verify (real code to sp23-bcs-104@cuilahore.edu.pk) →
      company "Sukoon" + minimal details → plan (only Free selectable) → pending screen.
- [ ] pending / inactive / rejected accounts CANNOT log in; each shows the right screen.
- [ ] Paid plans show correct price/duration (Rs 1,000/6mo, Rs 2,000/3mo) but are disabled.
- [ ] Signup collects no more than the QuickBooks-equivalent fields.
- [ ] status defaults to "pending"; login gated on "active", enforced server-side.

=======================================================================
PHASE B — FINMATRIX SUPER-ADMIN VIEW: COMPLETELY FUNCTIONAL
=======================================================================
Make the platform-operator view actually run the business. Using the Phase-0 audit, fix every
dead/partial Super-Admin screen so there are no dead ends:

- SuperAdminDashboardScreen: real KPIs from real endpoints — total companies, pending review count,
  active/inactive counts, signups over time. Every card/quick action navigates to a working screen.
  No mock data.
- CompanyManagementScreen (the core): list all companies with a STATUS filter
  (Pending / Active / Inactive / Rejected), each row showing company name, owner email, plan, and
  signup date. Search by name/email. Tapping a company opens a detail view:
    • Pending → shows submitted details with APPROVE and REJECT (with reason) actions that call the
      endpoints and update status live; on approve, that owner can immediately log in.
    • Active → DEACTIVATE action (status → inactive) that immediately blocks that company's logins.
    • Inactive → REACTIVATE action (status → active).
    • Rejected → shows the reason; allow re-approve if desired.
- SubscriptionPlansScreen: show the three plans (Free active; Standard Rs 1,000/6mo and Pro
  Rs 2,000/3mo as "coming soon"); reflect how many companies are on each. Editing plan availability
  is optional/config only.
- RevenueAnalyticsScreen: render from real data if available; if the metric isn't tracked yet, show
  a clean empty/"coming soon" state rather than a broken/mock chart.
- AdminSettingsScreen: make its actions functional (or clearly disabled with a reason) — no no-op
  buttons.
- Every list has loading / empty / error states and pull-to-refresh; every action surfaces server
  errors gracefully.
- ALL Super-Admin endpoints are role-guarded on the SERVER; a normal company Admin or Delivery token
  gets 403.

ACCEPTANCE (Phase B)
- [ ] Super-Admin dashboard shows real counts (incl. a correct "pending review" number) and every
      action navigates somewhere real.
- [ ] Super-Admin sees pending "Sukoon", opens it, approves → that owner can now log in.
- [ ] Super-Admin rejects another account with a reason → that user sees CompanyRejected.
- [ ] Super-Admin deactivates an active company → its users are blocked at login immediately;
      reactivation restores access.
- [ ] Status filter, search, and every detail action work with live updates and proper states.
- [ ] A non-super-admin token is rejected (403) by every /admin/companies and Super-Admin endpoint.

=======================================================================
VERIFICATION & DELIVERABLES
=======================================================================
- `npx tsc --noEmit` clean in both repos; backend `npm run build` succeeds; run test/acceptance.ts
  against a test Postgres — still green (accounting unaffected). Add tests for: the login status
  gate (pending/inactive/rejected can't log in) and the approve/reject/activate/deactivate endpoints
  (incl. non-super-admin rejection).
- On staging: run the whole signup flow with sp23-bcs-104@cuilahore.edu.pk and company "Sukoon"
  end to end → see it appear as Pending in the Super-Admin view → approve it → log in as that
  company's owner successfully. Then deactivate it and confirm login is blocked.
Deliverables: SIGNUP_SUPERADMIN_AUDIT.md, code in small commits per phase, and a CHANGELOG noting
what was wired vs newly built, the status model, the Super-Admin endpoints, and confirmation that
tsc + build + acceptance are green.