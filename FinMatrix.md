ROLE: Act as a senior full-stack engineer + product manager + accountant, shipping production software.
Work across FinMatrix (React Native + Expo, Redux Toolkit, React Navigation) and FinMatrix-Backend
(NestJS + TypeORM + PostgreSQL). Both codebases are ALREADY LARGE and in production use. The backend
already has almost every accounting API implemented (invoices, bills, payments, customers, vendors,
inventory, payroll, budgets, reports, etc.) — treat backend work as UPDATING/GATING existing endpoints, not
building new ones, except for the small set of genuinely new pieces called out below (company-type/plan
model, feature-flag map, delivery-personnel-specific endpoints if missing). The frontend already has the
screens/components for these features too, currently wired into a single navigation flow. BIG TASK: turn
this into a THREE-TIER product (Small business / Large organization / Warehouse) chosen at registration,
with SIX subscription plans (each type has a 3-month and a 6-month plan), server-enforced feature-gating,
per-tier navigation (separate stack navigators, not one stack with hidden items), matching plan cards, and
seeded dummy companies for all three types.

⚠️ CRITICAL CONSTRAINT — THIS IS A GATING/REORGANIZATION PROJECT, NOT A REBUILD:
- Do NOT rebuild, rewrite, or re-architect any existing screen, endpoint, entity, or module "from scratch."
  Assume the feature almost certainly already exists somewhere in the codebase before writing anything new.
- Backend: your job is to UPDATE existing controllers/services with guards/flag checks and ADD the small
  amount of genuinely new infrastructure (companyType/plan fields, FEATURE_MAP, PLAN_CONFIG). Do not
  duplicate or replace working endpoint logic — wrap it.
- Frontend: your job is to REORGANIZE existing screens into per-tier stack navigators (see Phase 3) and
  ADD the type/plan-selection registration flow — not to redesign or rebuild the screens themselves.
- Every module named in FinMatrix_Tier_Feature_Guide.md (invoices, payroll, inventory, deliveries, etc.)
  should be treated as "already implemented — find it, map it, gate it, place it in the right navigator"
  rather than "build this." Only build net-new code for things that genuinely don't exist yet.
- Never delete, rename, or restructure existing working code paths as a side effect of adding gating.
  Feature-gating must be additive: existing single-tier customers/data must keep working exactly as before
  until they're explicitly migrated to a companyType.
- If you find yourself about to regenerate a whole module or screen, STOP and re-check the existing code —
  the correct move is almost always a small, targeted diff (a guard, a flag check, moving an existing
  screen into a different navigator), not a rewrite.
- Never break the accounting engine; Trial Balance and Balance Sheet must always balance, before and after
  every phase.
- Work in phases; STOP after Phase 0 for review. Do not proceed to Phase 1 code changes until the audit is
  reviewed and approved.

Reference doc: FinMatrix_Tier_Feature_Guide.md (attached alongside this prompt) is the authoritative
feature list per tier — use it as a CHECKLIST to locate existing functionality in the codebase, not as a
spec for new functionality. Read it before Phase 0 — every module named in that guide must be traced to
its actual existing route/screen/entity/service in the audit, with an explicit note if (and only if) it
turns out to be genuinely missing.

⚠️ SAFETY REQUIREMENTS — this is a live production system with real users and real money in it:
1. GENUINE TRACING, NOT SKIMMING: In Phase 0, actually open and read each relevant controller/service/
   screen file before writing a conclusion about it in the audit. Do not infer a module's status from
   folder/file names alone. If you're not sure whether something exists, say so explicitly in the audit
   rather than guessing — an audit that looks complete but is wrong is more dangerous than one that
   honestly flags uncertainty.
2. BACKUP BEFORE ANY MIGRATION: Before running any database migration in Phase 1, output the exact backup
   command for this stack (e.g. `pg_dump`) and STOP to confirm the backup has actually been taken before
   proceeding. Never run a migration against production data without an explicit, confirmed backup step
   immediately before it.
3. STAGING FIRST: Every phase that touches the backend schema, existing endpoints, or the migration should
   be run against a staging/local copy of the database first, with the Phase 5 test suite passing there,
   before touching production. Call this out explicitly at the start of Phase 1 and Phase 4.
4. KILL SWITCH: Build a single, simple override — e.g. an `allFeaturesUnlocked` boolean on the company
   record (or a global env var / admin toggle) that, when true, bypasses the feature-flag checks entirely
   and restores full access regardless of companyType/plan. This must be flippable by an admin in seconds
   (a DB update or admin-panel toggle, not a deploy) so that if the gating logic misbehaves after
   deployment, current paying customers are never locked out of features they already had. Document exactly
   how to flip it in TIERING_AUDIT.md and again in the final deliverables.
5. ROLLBACK PLAN: The audit and each phase's output must include the exact steps to revert that phase's
   changes (migration down-script, git revert points) so any phase can be undone independently without
   needing to unwind the whole project.

============================ THE MODEL ============================
Three company types on the SAME shared accounting core (the ledger/posting engine is NEVER gated):

- SMALL BUSINESS → accounting only: invoices, payments, bills, expenses, customers, vendors, chart of
  accounts, tax, estimates, core reports (P&L, Balance Sheet, Trial Balance, aging). NO inventory, NO
  delivery, NO payroll/budgets, NO multi-user roles/audit log/period close. Invoices default to SERVICE
  lines (revenue only, NO COGS/inventory). Nav: Dashboard · Invoices · Bills · Customers · Vendors ·
  Reports — nothing else visible.

- LARGE ORGANIZATION → everything Small Business has, PLUS: payroll (employee records, salary structure,
  monthly payroll run, payslips, auto-posts salary expense/payables/tax payable to GL), employees module,
  budgets vs actual (per account/department, variance report), multi-user roles (Admin/Accountant/
  Approver/Viewer with a real permission matrix), approval workflows for bills/expenses over a threshold,
  audit log (who did what, when — exportable, read-only), period close (lock a month, reopen requires
  admin + logged reason). Inventory = optional per-company toggle (basic stock + COGS only, no PO/GRNI, no
  deliveries). NO delivery module at all, even with inventory toggled on.

- WAREHOUSE → everything Large Organization has, PLUS full inventory (SKU, weighted-average costing,
  reorder points), purchase orders → GRNI (Goods Received Not Invoiced) 3-way match (PO → receipt →
  vendor bill), a Deliveries module with states Assigned → In Transit → Delivered(Paid) →
  Delivered(Unpaid) → Returned, a separate lightweight delivery-personnel portal (riders see ONLY "My
  Deliveries" / mark-delivered / upload proof — never accounting screens), shadow inventory (rider's
  in-hand stock reconciliation), and admin-approval gating: a rider marking "delivered" only queues the
  delivery — an admin approval is what actually triggers the GL posting. Delivery↔accounting linkage:
    - Assign → Dr Goods in Transit / Cr Inventory
    - Admin approves "delivered" → Dr Cash (if paid) or Dr A/R (if unpaid) / Cr Revenue, AND
      Dr COGS / Cr Goods in Transit
    - Returned → reverse Goods in Transit back to Inventory, no revenue/COGS posted
  Goods in Transit must net to zero across all completed (delivered or returned) deliveries — this is the
  key integrity check to assert after every seed and in tests.

SUBSCRIPTION PLANS — NO FREE PLAN. Each type has TWO paid plans by billing period; the 6-month plan has a
LOWER effective monthly rate than the 3-month plan (standard retention lever, confirmed against Pakistani
SaaS accounting pricing — competitors run roughly PKR 2,000–6,000/month for comparable tiers, so these are
well-calibrated). Put ALL of this in ONE server-side PLAN_CONFIG (single source of truth; prices easily
changeable). CONFIRMED FINAL PRICING (PKR) — no longer TODO placeholders:

PLAN_CONFIG (type → { durationMonths, monthlyPrice, totalPrice }):
- small_business_3mo:  { durationMonths: 3, monthlyPrice: 2500, totalPrice: 7500  }
- small_business_6mo:  { durationMonths: 6, monthlyPrice: 2000, totalPrice: 12000 }   // lower /mo
- large_org_3mo:       { durationMonths: 3, monthlyPrice: 5000, totalPrice: 15000 }
- large_org_6mo:       { durationMonths: 6, monthlyPrice: 4000, totalPrice: 24000 }   // lower /mo
- warehouse_3mo:       { durationMonths: 3, monthlyPrice: 4000, totalPrice: 12000 }
- warehouse_6mo:       { durationMonths: 6, monthlyPrice: 3000, totalPrice: 18000 }   // lower /mo

All prices in PKR. Currency field on Company/Subscription should default to "PKR" but not be hardcoded —
keep it a config value so it can change later without a migration.

Each plan also carries the feature set of its type. A subscription's expiry = start + durationMonths.

============================ PHASE 0 — AUDIT (produce TIERING_AUDIT.md, then STOP) ============================
Before writing or changing ANY code, read through both repos and produce a full inventory:

1. Existing-feature inventory (this is the most important part — do this thoroughly):
   For each module in FinMatrix_Tier_Feature_Guide.md (invoices, bills, customers/vendors, chart of
   accounts, tax, estimates, reports, payroll, employees, budgets, multi-user roles, audit log, period
   close, inventory, purchase orders/GRNI, deliveries, delivery-personnel access, shadow inventory), state:
   - Does it already exist in the frontend? Which screen(s)/route(s)/Redux slice(s)?
   - Does it already exist in the backend? Which module/controller/service/entity?
   - Is it already fully working, partially working, or genuinely absent?
   Only mark something "net-new" if it truly does not exist after a real search of the codebase — not
   because it wasn't obvious from folder names.
2. Current registration/onboarding flow, existing plan/subscription infrastructure (is there already a
   plan/pricing model, even a single-tier one? Reuse and extend it rather than replacing it).
3. Current navigation structure (frontend) — map the EXACT existing navigator tree: root navigator type
   (stack/drawer/tab), every screen currently registered, which navigator each belongs to, and how
   navigation currently decides what a user sees (if anything is already conditional). This is required
   input for Phase 3, where existing screens get redistributed into per-tier stack navigators rather than
   toggled with hidden menu items.
4. Current company/account model (backend) — exact existing fields/entities/migrations for company,
   subscription, user, roles — so new fields are additive columns/migrations, not schema replacements.
5. Propose exactly where companyType + the feature-flag layer + the six-plan PLAN_CONFIG live, following
   existing conventions in the codebase (naming, folder structure, module boundaries) rather than
   introducing new patterns.
6. A file-by-file change list, split into two explicit columns: "MODIFY (existing file, small diff)" vs
   "NEW (file genuinely doesn't exist today)". The MODIFY column should be the large majority of the list
   for a codebase that already has these features.
7. Explicit call-outs of any risk areas: places where adding a feature flag/guard could plausibly touch
   the accounting-posting logic, and how you'll avoid regressing it (e.g. wrap with a flag check at the
   route/controller boundary, never inside the posting engine itself).

Output TIERING_AUDIT.md, then STOP for my review. Do not start Phase 1 until I approve the audit.

============================ PHASE 1 — BACKEND: company type, feature flags, six plans ============================
All steps below are additive changes to the existing company/subscription model and existing endpoints —
do not touch the internals of already-working modules (invoice posting, payroll calculation, inventory
costing, etc.). Gating happens at the controller/route boundary (guards/decorators), never by editing the
business logic inside those modules.

1. Add companyType ('small_business'|'large_org'|'warehouse') and subscriptionPlan (one of the six keys
   above) + subscriptionExpiry to the EXISTING company model via an additive migration (new nullable/
   defaulted columns — do not alter or drop existing columns). Existing companies without a companyType
   set should default to whichever tier matches their current feature access (likely large_org, since the
   audit will show they already have every feature) so nothing breaks for current users.
2. Single FEATURE MAP keyed by companyType (accounting always true; inventory/delivery/payroll/budgets/
   multiUser/auditLog/periodClose per THE MODEL above; large-org inventory = optional flag, independent of
   companyType, stored per-company).
3. Enforce server-side: each module's endpoints return 403 when the company's feature is off (small-
   business token on delivery/payroll → 403; large-org token on delivery endpoints → 403 even with
   inventory toggled on). Type/features/plan derive from the JWT/company record, never the client.
4. PLAN_CONFIG as above (six plans, 3- and 6-month per type, 6-month cheaper per month, PKR).
5. SAFEGUARD: companies without inventory post service-only invoices (revenue, NO COGS/inventory); books
   still balance.
6. Delivery-personnel role: a distinct role/JWT scope with access to ONLY delivery-status endpoints
   (list assigned, mark delivered, upload proof) — explicitly 403 on every accounting/reporting endpoint,
   even for warehouse-tier companies.
7. Kill switch: implement the `allFeaturesUnlocked` override described in SAFETY REQUIREMENTS above,
   checked first in the feature-guard logic (short-circuits to "allow" before the companyType/plan check
   runs). Add an admin-only endpoint or documented DB update to flip it per-company or globally.

============================ PHASE 2 — REGISTRATION: choose type → show that type's TWO plans ============================
Update signup (frontend + backend):
1. After account creation + email verification, add a "Choose your business type" step: three cards (Small
   business / Large organization / Warehouse) with a 3–4 bullet feature summary per card pulled from
   FinMatrix_Tier_Feature_Guide.md so the user isn't guessing. Selecting one sets companyType.
2. Then show ONLY that type's TWO plan cards side by side — the 3-month and the 6-month — each showing the
   monthly price (PKR), the total, the billing period, and (highlight) the savings on the 6-month. The
   user picks one; it sets subscriptionPlan.
3. Proceed through the existing pay/submit-screenshot → admin-approval flow. On approval the company is
   provisioned with the correct feature set and the chosen plan's expiry.

============================ PHASE 3 — FRONTEND: per-tier stack navigators & navigation maps ============================
Reorganize the EXISTING screens (do not rebuild them) into separate stack navigators per tier, selected at
runtime by a root switcher based on the company's feature flags from /me. Concretely:

1. Root navigator: after login, fetch companyType + feature flags once (e.g. in an auth/company context or
   Redux slice), then render ONE of the following navigators — never a single shared stack with conditional
   `if (flag) <Screen/>` items sprinkled through it:
   - `SmallBusinessNavigator` (stack): Dashboard → Invoices → Bills → Customers → Vendors → Reports.
     Reuses the existing screen components for each; only the navigator's route list changes.
   - `LargeOrgNavigator` (stack, or stack nested in a drawer/tab if that's the existing pattern from the
     audit): everything in SmallBusinessNavigator's routes PLUS Payroll, Employees, Budgets, Team & Roles,
     Audit Log (+ Inventory route if the company's inventory toggle is on).
   - `WarehouseNavigator` (stack): everything in LargeOrgNavigator's routes PLUS Inventory, Purchase
     Orders, Deliveries.
   - `DeliveryPersonnelNavigator` (stack): a completely separate, minimal navigator — "My Deliveries" list
     screen + mark-delivered/upload-proof screen only. This navigator has NO route to any accounting
     screen, so there's nothing to gate at the UI layer for this role (defense in depth alongside the
     backend 403s from Phase 1).
2. Each navigator is a distinct route/navigation map (array of {name, component} entries), not one shared
   map with items removed — this keeps the tier boundary explicit in code and makes it obvious to future
   maintainers which screens belong to which tier. Existing screen COMPONENTS are imported and reused
   as-is across navigators where they're shared (e.g. Dashboard, Invoices, Reports appear in all three
   business navigators, just imported into each navigator's route list).
3. A single top-level switch (e.g. in App.tsx or the main navigation container) chooses which navigator to
   mount based on companyType + role (delivery personnel vs regular user), so there is exactly one place
   in the app that decides "which app does this user see."
4. Dashboards adapt per type using the SAME dashboard screen component with conditional widgets driven by
   feature flags (small-business = 4 cards; large-org adds budget/payroll widgets; warehouse adds
   Goods-in-Transit and low-stock widgets) — do not fork the dashboard into three separate screen files
   unless the audit shows the existing dashboard component can't reasonably support that via props/flags.
5. No dead links: every route in every navigator must resolve to a real, working existing screen. Gating
   is also enforced server-side (Phase 1), so a navigator mistake never becomes a security hole — but it
   would still be a broken UX, so double-check each navigator's route list against the feature map.

============================ PHASE 4 — SEED DUMMY DATA (through the real posting engine) ============================
Run this against staging/local first, per SAFETY REQUIREMENTS — do not seed demo companies directly into
production without confirming the seed script is idempotent and scoped ONLY to the three demo companies
named below.

Seed three active/approved demo companies, each on one of its plans, ready to log into:
- LARGE ORG "MetroMatrix" — metromatrix@gmail.com / 123456 — on a large_org plan (pick 3mo or 6mo). Seed
  employees + a processed payroll run, budget vs actual, customers/vendors, invoices+payments, bills,
  reports tied out.
- SMALL BUSINESS "Sukoon" — sukoon@gmail.com / 123456 — on a small_business plan. Seed service invoices +
  payments, expense bills, customers/vendors — NO inventory/COGS. Reports tied out.
- WAREHOUSE "Warehouse Co" — warehouse@gmail.com / 123456 — on a warehouse plan. Seed inventory items,
  POs→receipts (GRNI), customers/vendors, invoices, AT LEAST 2 delivery personnel WITH credentials, and
  sample deliveries in each state (assigned→Goods in Transit, delivered+paid, delivered+unpaid, returned).
  Reports tied out; Goods in Transit nets to zero for completed deliveries.
Idempotent seed (documented command wipes ONLY these demo companies and regenerates). After seeding assert
for EACH company: Trial Balance balances, Balance Sheet balances, Inventory Valuation ties out where
inventory exists, Goods in Transit nets to zero for completed deliveries.

============================ PHASE 5 — HARDEN & VERIFY ============================
Tests: feature-flag enforcement (forbidden endpoints → 403 per type, INCLUDING delivery-personnel role
hitting accounting endpoints), registration sets right type + plan + expiry, the six plans exist with
correct durations/prices in PKR and 6-month cheaper per month, service-only invoice posts no COGS and
balances, warehouse delivery cycle posts correctly at each state transition, seeds produce balanced books
for all three, kill switch (`allFeaturesUnlocked`) actually restores full access when toggled and is
checked BEFORE the plan/type gate. Confirm each phase's rollback steps (from SAFETY REQUIREMENTS) actually
work by testing at least one migration down-script on staging. `npx tsc --noEmit` clean both repos; backend
builds; acceptance suite green in CI.

============================ DELIVERABLES ============================
TIERING_AUDIT.md (including the backup command used, the kill-switch documentation, and per-phase rollback
steps); small commits per phase; the three-tier feature-flag layer (server-enforced) with the
`allFeaturesUnlocked` kill switch checked first; the four stack navigators (SmallBusinessNavigator,
LargeOrgNavigator, WarehouseNavigator, DeliveryPersonnelNavigator) with a single root switch selecting
between them; the six-plan PLAN_CONFIG (PKR, confirmed pricing above); the type-selection registration with
the two plan cards per type; and the three seeded demo companies (seeded on staging first). A CREDENTIALS.md
listing every login (the three admins above AND the warehouse delivery-personnel credentials created).
Confirm: accounting core never gated, service-only invoices balance, all three demo companies tie out, six
plans priced correctly, gating enforced server-side (including delivery-personnel role restrictions), kill
switch tested and working, rollback steps verified on staging, navigators contain no dead links, tsc +
build + acceptance green.