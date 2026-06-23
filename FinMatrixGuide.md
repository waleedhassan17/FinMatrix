# FinMatrix — Production-Hardening & Accounting-Authenticity Spec
### A work order for an AI coding agent (Claude Code / Copilot) with access to BOTH the frontend and backend repos

> **Read this entire file before writing any code.** It is the single source of truth for making FinMatrix a 100% production-ready, QuickBooks-authentic, double-entry accounting system. Your job is to **audit, fix, connect, and harden the features that already exist** — not to add new features, not to remove or simplify any feature, and not to redesign the UX.

---

## 0. MISSION & HARD CONSTRAINTS

**Mission:** Make every existing feature accounting-correct, fully wired end-to-end (UI → API → database → reports), atomic, auditable, and production-grade — so the books always balance and every number traces back to a posted ledger entry, exactly like QuickBooks.

**Product positioning (important):** FinMatrix is a **general-purpose accounting system that ANY company can use to run its books** — the warehouse/delivery capability is an **optional module layered on top**, not the core. Therefore the core accounting (Chart of Accounts, opening balances, invoices, bills, payments, journals, reports) must be fully usable and correct **even for a company that never touches inventory or deliveries.** Do not make any core accounting feature depend on the delivery/agency module.

**One authorized addition (exception to "no new features" below):** the user has explicitly requested a **guided first-run setup / "Add Opening Balance" entry point on the dashboard** (see §5.7). This is permitted because it only *surfaces and connects existing functionality* (opening balances, COA, inventory, customers, vendors) — it introduces no new accounting logic. Build it on the existing `OnboardingScreen` / `CompanySetupScreen` scaffolding, not from scratch. No other new features are authorized.

**Hard constraints — do NOT violate:**
1. **Do not remove, hide, rename, or reduce the scope of any existing feature, screen, endpoint, or field.** Every screen and endpoint listed in Appendix A must remain and must work.
2. **Do not change the visual design, navigation structure, or user-facing workflow** except where a flow is broken or accounting-incorrect. If you must change a flow for correctness, keep it minimal and document why.
3. **Do not invent endpoints, fields, or libraries that aren't needed.** Prefer fixing/connecting what exists. If a new endpoint is genuinely required (e.g. a missing report endpoint), add it following the existing naming and response conventions.
4. **Never break double-entry.** After any operation the system performs, total debits MUST equal total credits. This is non-negotiable and is the primary acceptance test.
5. **Preserve the audit trail.** Never hard-delete posted financial records. Corrections happen via reversing entries / voids (the `void` endpoints already exist — use them).
6. **Make every change in small, reviewable commits** with a clear message, and update tests as you go.
7. **When unsure about an accounting rule, follow this spec.** When this spec is silent, follow standard US-GAAP/QuickBooks behavior and leave a `// FINMATRIX-REVIEW:` comment explaining the assumption.

---

## 1. SYSTEM MAP & THE FRONTEND/BACKEND BOUNDARY

- **Frontend:** React Native + Expo + TypeScript. Redux Toolkit using a co-located `createAppSlice` pattern (each screen owns a `*Slice.ts`). Network layer in `src/network/*Network.ts` (axios, bearer token + `x-company-id` header). Serializers in `src/serializers/*` map API ↔ UI. Models/types in `src/models/*` and `src/types/`.
- **Backend:** the API the frontend points to (`API_BASE_URL` in `src/network/apiHelpers.ts`). **This is where all accounting truth lives** — journal posting, COGS, balances, reports. Discover its stack, ORM, and DB on first run.

**The boundary rule:** the frontend records *documents* and *renders* results; the backend *posts the double-entry journal* for every document and *computes every report from the ledger*. The frontend must never compute authoritative financial totals that the backend should own (it may display/preview them, but the server is the source of truth).

---

## 2. PHASE 0 — DISCOVERY (do this first, produce a report, then stop and re-plan)

Before changing anything, produce `AUDIT_REPORT.md` covering:

1. **Backend stack & data model:** language, framework, ORM, database. List every table and its columns. Identify the `accounts`, `journal_entries`, `journal_lines` (or equivalent) tables — these are the ledger.
2. **Posting audit — for EACH document type below, find where (if anywhere) the backend posts journal entries, and confirm debits=credits:** invoice, payment received, bill, bill payment, PO receipt, credit memo, vendor credit, inventory adjustment, physical count, stock transfer, tax payment, payroll run, manual journal, opening balances. Mark each as: ✅ posts correctly / ⚠️ posts but wrong / ❌ does not post.
3. **Endpoint coverage:** cross-check Appendix A. For each endpoint the frontend calls, mark: implemented / missing / returns-wrong-shape. **Pay special attention to the report endpoints** (P&L, Balance Sheet, Trial Balance, General Ledger, Cash Flow, A/R Aging, Inventory Valuation) — confirm whether they are computed server-side from the ledger or recomputed on the client. They MUST be server-side from the ledger.
4. **Serializer/contract mismatches:** any place where the serializer expects a field the API doesn't return (or vice-versa).
5. **Connectivity gaps:** any screen that exists but isn't reachable from navigation; any slice/thunk that's defined but never dispatched; any network function never called.
6. **The three known issues in §4** — confirm and locate them.

Output the report, list the proposed phased plan (use §7), then proceed.

---

## 3. THE CANONICAL ACCOUNTING CONTRACT (source of truth — implement on the backend, mirror previews on the frontend)

Account numbering already follows QuickBooks/Sage-50 ranges (1xxx asset, 2xxx liability, 3xxx equity, 4xxx revenue, 5xxx COGS, 6xxx operating expense, 7xxx other expense; see `src/utils/accountNumberUtils.ts`). Every document below MUST generate a balanced journal entry **atomically in a single DB transaction** with the document. If posting fails, the document must not be saved (all-or-nothing).

Use these system accounts (resolve by role, create on company setup if missing): Cash/Bank, **Accounts Receivable (1200)**, **Inventory (1300)**, **Accounts Payable (2000)**, **Sales Tax Payable (2400)**, **Owner Equity (3000)**, **Retained Earnings (3100)**, **Opening Balance Equity (3900)**, **Sales Revenue (4000)**, **COGS (5000)**, and a **GRNI / Inventory-Received-Not-Billed clearing (2050-ish)** for the PO→Bill flow.

### 3.1 Invoice issued (`POST /invoices`, `/invoices/:id/send`)
Two simultaneous entries:

**Revenue entry**
| Account | Debit | Credit |
|---|---|---|
| Accounts Receivable (1200) | grand total | |
| Sales Revenue (4000) | | subtotal − discount |
| Sales Tax Payable (2400) | | tax |

**Cost entry** (for each inventory line, using the item's cost method)
| Account | Debit | Credit |
|---|---|---|
| COGS (5000) | qty × unit cost | |
| Inventory (1300) | | qty × unit cost |

Side effects: reduce `quantityOnHand` (and release `quantityCommitted`) per line; set invoice status `draft→sent→partial→paid→overdue` based on payments/due date; never let an invoice post if a line item has no resolvable cost.

### 3.2 Payment received (`POST /payments`)
| Account | Debit | Credit |
|---|---|---|
| Cash/Bank (by method) | amount | |
| Accounts Receivable (1200) | | amount |

Allocate across the customer's outstanding invoices; update each invoice `amountPaid`/status; overpayment posts to a customer credit/unapplied-cash liability, not to revenue.

### 3.3 Purchase Order receipt (`POST /purchase-orders/:id/receive`)
PO itself posts nothing. On receipt (accrual):
| Account | Debit | Credit |
|---|---|---|
| Inventory (1300) | qty received × cost | |
| GRNI clearing (2050) | | qty received × cost |

Increase `quantityOnHand`; update `receivedQuantity`; PO status → partially/fully received.

### 3.4 Bill (`POST /bills`, `POST /purchase-orders/:id/create-bill`)
Bills are account-based. **Two cases — handle both without double-counting inventory:**
- **Bill created from a received PO:** debit GRNI clearing (2050) to clear it, not Inventory.

| Account | Debit | Credit |
|---|---|---|
| GRNI clearing (2050) | line amount | |
| Input Tax / Sales Tax Payable (2400) | tax | |
| Accounts Payable (2000) | | total |

- **Direct expense bill (rent, fuel, utilities):** debit the chosen 6xxx expense account.

| Account | Debit | Credit |
|---|---|---|
| 6xxx Expense | line amount | |
| Input Tax (if any) | tax | |
| Accounts Payable (2000) | | total |

### 3.5 Pay bills (`POST /bills/pay`)
| Account | Debit | Credit |
|---|---|---|
| Accounts Payable (2000) | amount | |
| Cash/Bank | | amount |

### 3.6 Credit memo (`POST /credit-memos`, `/apply`, `/refund`)
Issue (reverse of an invoice): debit Sales Revenue (and Tax Payable), credit Accounts Receivable; if goods returned, debit Inventory / credit COGS and restock. `/apply` nets against an open invoice; `/refund` credits Cash/Bank.

### 3.7 Vendor credit (`POST /vendor-credits`, `/apply`) — mirror of 3.6 on the AP side.
Debit Accounts Payable, credit the original expense/inventory account; `/apply` nets against an open bill.

### 3.8 Inventory adjustment / physical count (`/inventory/items/:id/adjust`, `/inventory/physical-counts`)
| Account | Debit | Credit |
|---|---|---|
| Inventory Shrinkage/Adjustment expense (6xxx) | decrease value | |
| Inventory (1300) | | decrease value |
(reverse the two sides for an increase). Stock transfer (`/inventory/transfers`) moves quantity between locations with **no P&L impact** (asset-to-asset, or no entry if same GL account).

### 3.9 Tax payment (`POST /taxes/payments`)
| Account | Debit | Credit |
|---|---|---|
| Sales Tax Payable (2400) | amount | |
| Cash/Bank | | amount |

### 3.10 Payroll run (`POST /payroll/runs/:id/process`)
Debit salary/wage expense (and employer taxes) for gross; credit payroll liabilities (taxes withheld) and Cash/Bank (net pay). Must balance.

### 3.11 Manual journal (`POST /journal-entries`, `/:id/post`)
Already enforces debits=credits before `posted` (see `GeneralJournalFormScreen`). Keep this. `draft` posts nothing; `posted` hits the ledger; `/void` creates a reversing entry.

### 3.12 Opening balances (critical — make this airtight)
Two supported paths; both must keep the Trial Balance balanced:
- **Opening journal (preferred):** a normal balanced journal entry dated the conversion date, offsetting to **Opening Balance Equity (3900)**.
- **Per-account opening balance field (COA form):** when a non-zero opening balance is set on account creation, the backend MUST auto-post the offsetting side to **Opening Balance Equity (3900)** in the same transaction. **If it currently just stores a number with no offsetting entry, fix it** — that is the #1 cause of an unbalanced Trial Balance.

### 3.13 Voids & reversals (all document types)
Voiding any posted document (`/invoices/:id/void`, `/journal-entries/:id/void`, `/credit-memos/:id/void`, `/vendor-credits/:id/void`) must create a dated **reversing journal entry** and restore inventory where applicable — never delete the original posting. The journal model already has `reversalOfId`, `voidReason`, `status:'void'` — use them everywhere.

---

## 4. KNOWN ISSUES FOUND IN THE FRONTEND (fix these explicitly)

1. **Hard-coded `companyId: 'comp-001'`** in `src/screens/ChartOfAccounts/COAForm/COAFormScreen.tsx` (the `createAccount` dispatch). Replace with the authenticated user's real company ID from auth state. Audit the whole codebase for any other hard-coded IDs and remove them. Ensure the backend always derives tenant from the auth token / `x-company-id`, never trusts a client-sent `companyId`.

2. **Per-account opening balance must post an offsetting entry** (see §3.12). Fix backend; on the frontend keep the field but make its behavior correct, or steer users to the opening journal.

3. **Inventory-vs-Bill double-count risk** (see §3.3/§3.4). Implement the GRNI clearing account so PO receipt raises inventory and the Bill clears GRNI — inventory must rise exactly once per purchased unit. Make the Bill form clearly distinguish "bill against a received PO" from "direct expense bill."

---

## 5. CONNECTIVITY & WIRING REQUIREMENTS ("everything connected like QuickBooks")

1. **Every endpoint in Appendix A is implemented on the backend and returns the shape the matching serializer expects.** Fix mismatches on whichever side is wrong (prefer aligning the backend to the documented contract; if the frontend serializer is wrong, fix it there).
2. **All reports are server-computed from the ledger.** P&L, Balance Sheet, Trial Balance, General Ledger, Cash Flow, A/R Aging, Inventory Valuation must each have a backend endpoint that derives the numbers from posted journal entries (not recomputed on the client, not from cached document tables). If any report endpoint is missing, add it (e.g. `GET /reports/profit-loss`, `/reports/balance-sheet`, `/reports/trial-balance`, `/reports/general-ledger`, `/reports/cash-flow`, `/reports/ar-aging`, `/reports/inventory-valuation`) following existing conventions, and point the frontend network/serializer at it.
3. **Cross-report consistency invariants** (enforce and test): Trial Balance debits = credits; Balance Sheet Inventory = Inventory Valuation total; Balance Sheet A/R = sum of open invoices = A/R Aging total; Balance Sheet A/P = sum of open bills; P&L net income for the period rolls into Retained Earnings/equity so the Balance Sheet balances.
4. **Document conversions are wired and post correctly:** estimate→invoice / →sales-order, sales-order→invoice / fulfill / cancel, PO→bill. Converting must carry line items, amounts, and customer/vendor through, and only the final posting document (invoice/bill) hits the ledger.
5. **Delivery ↔ inventory loop is closed:** rider completes delivery → quantities enter the shadow-inventory / inventory-approval queue → admin approval (`/inventory-approvals/:id/review`) commits the real stock movement and any required journal posting. No stock should change in the real ledger until approved.
6. **No orphan screens or dead thunks:** every screen reachable from navigation; every network function either used or removed-if-truly-dead (but do not remove a feature — if a screen is unreachable but is a real feature, wire it into navigation).

7. **Guided first-run setup + "Add Opening Balance" on the dashboard (AUTHORIZED ADDITION).** A brand-new company currently has no obvious place to establish its starting financial position. Add a **Company Setup Checklist** that appears on the **dashboard home screen** whenever setup is incomplete, and an always-available **"Set Up / Add Opening Balance"** entry point. Requirements:
   - **Detect incomplete setup** server-side (e.g. a `setupCompleted` flag on the company, plus computed signals: has accounts beyond the seeded defaults? has any opening balance / opening journal? has items/customers/vendors?). Expose it via the existing company/settings endpoints; surface it on `GET /reports/dashboard`.
   - **Render an ordered checklist** on the dashboard in the exact accounting order, each item routing to the **existing** screen/flow (do NOT build parallel screens):
     1. **Add Opening Balances** → route to the General Journal opening-entry flow (preferred) and/or the COA opening-balance field. This is the headline CTA the user asked for.
     2. **Review Chart of Accounts** → COA list/form.
     3. **Add Inventory items** (optional / skippable for service-only companies) → Inventory form.
     4. **Add Customers** → Customer form.
     5. **Add Vendors** → Vendor form.
     6. **Set Tax rates** → Tax Settings.
   - Each item shows **done / not-done** state and a **Skip** option (a service company may skip inventory; any company may dismiss the whole checklist). Mark `setupCompleted=true` when finished or dismissed; once complete, the checklist hides but the "Add Opening Balance" action remains reachable (e.g. under More → Accounting) so balances can still be entered/corrected later.
   - **No new accounting logic:** the "Add Opening Balance" action MUST reuse the §3.12 opening-balance posting (offset to Opening Balance Equity 3900). It is a navigation/onboarding wrapper over existing endpoints, nothing more.
   - **Build on existing scaffolding:** extend `src/screens/Onboarding/OnboardingScreen.tsx` + `onboardingSlice.ts` and `src/screens/Auth/CompanySetup/CompanySetupScreen.tsx`; add the checklist card to `src/screens/HomeScreen/AdminDashboardScreen.tsx`. Keep the existing visual design language.

---

## 6. PRODUCTION-HARDENING REQUIREMENTS (the difference between "works" and "100% production ready")

1. **Atomicity:** every document + its journal posting + its inventory movement happen in ONE database transaction. Partial writes are forbidden. Roll back the whole thing on any failure.
2. **Money is exact:** store money as integer minor units (paisa) or a fixed-precision decimal — never floats — on the backend. Define one rounding rule (round-half-up to 2 dp) and apply it identically to tax, discounts, and allocations on both sides so totals never drift by a paisa.
3. **Idempotency:** all create/post POSTs (invoices, payments, bill payments, journal posts, PO receipts, deliveries) accept an idempotency key so a retried request can't double-post. Critical for mobile networks.
4. **Period locking:** add the ability to close an accounting period; block (or require explicit override + audit log) any posting dated into a closed period.
5. **Multi-tenant isolation:** every query is scoped to the authenticated company. Add tests proving company A can never read/write company B's data. Derive tenant from the token, never from client input.
6. **Auth & roles:** confirm role-based access (Admin, Staff, Delivery Personnel, Super Admin) is enforced on the **backend**, not just by hiding frontend screens. A rider's token must be rejected by financial endpoints. Verify the access/refresh-token rotation in `apiHelpers.ts` works on expiry and that signout revokes tokens.
6. **Audit log:** record who/what/when for every posting and every void (an `/audit` surface already exists — ensure all financial mutations write to it).
7. **Concurrency:** use optimistic locking or row versions so two users can't both pay the same invoice/bill and overpay it.
8. **Validation parity:** every frontend validation (required fields, numeric, ranges, debits=credits) is also enforced server-side. The client is convenience; the server is the gatekeeper.
9. **Observability:** structured logging on all posting paths, error tracking (e.g. Sentry), and health/readiness endpoints. No silent failures.
10. **Config & secrets:** no secrets or hard-coded URLs/keys in the repo; environment-based config; separate staging vs production; automated DB backups; DB migrations are versioned and runnable.
11. **Maps/GPS for delivery:** real dev/prod build (not Expo Go), Google Maps SDK + Geocoding + Directions enabled with billing, geocode backfill for existing deliveries, background-location permission flow.

---

## 7. PHASED WORK PLAN (do in order; keep each phase green before the next)

- **Phase 0 — Discovery:** produce `AUDIT_REPORT.md` (§2).
- **Phase 1 — Ledger integrity:** make the journal-posting engine correct and atomic for every document in §3; fix opening-balance offset (§3.12) and the three known issues (§4). Acceptance: every document posts a balanced entry.
- **Phase 2 — Inventory & COGS:** PO-receipt/GRNI/bill flow (no double-count), COGS on sale by the item's cost method, adjustments/counts/transfers post correctly, delivery-approval loop closed.
- **Phase 3 — Reports from the ledger:** all reports server-computed; cross-report invariants (§5.3) hold.
- **Phase 4 — Connectivity:** endpoint/serializer parity, conversions, no orphan screens/thunks, and the guided dashboard setup checklist / "Add Opening Balance" entry point (§5).
- **Phase 5 — Hardening:** atomicity, money precision, idempotency, period lock, tenant isolation, roles, audit, concurrency, observability, config (§6).
- **Phase 6 — Verification:** the full acceptance suite (§8) passes end-to-end on a seeded test company.

---

## 8. ACCEPTANCE TEST SUITE (this is the definition of "100% production ready")

Implement these as automated integration tests against a seeded test company. **All must pass.**

**Ledger invariants (must hold after EVERY test below):**
- Trial Balance: total debits = total credits (to the paisa).
- Assets = Liabilities + Equity on the Balance Sheet.
- Balance Sheet Inventory = Inventory Valuation report total.
- Balance Sheet A/R = Σ open invoices = A/R Aging total; Balance Sheet A/P = Σ open bills.

**Scenario tests:**
1. **Opening balances** via opening journal and via per-account field → Trial Balance balances in both cases.
2. **Issue invoice** (100 units @ price, +tax) → A/R↑, Revenue↑, Tax Payable↑, COGS↑, Inventory↓, qty↓; status correct; invariants hold.
3. **Receive full payment** → Cash↑, A/R→0, status=paid, A/R Aging clears.
4. **Receive partial payment** → status=partial, balance correct.
5. **PO → receive → create bill → pay** → inventory rises exactly once, GRNI nets to zero, A/P↑ then →0, Cash↓.
6. **Direct expense bill → pay** → expense↑, A/P↑ then →0; inventory untouched.
7. **Credit memo (with return)** → A/R↓, Revenue↓, Inventory↑, COGS↓; `/apply` nets an open invoice.
8. **Vendor credit** → A/P↓; `/apply` nets an open bill.
9. **Inventory adjustment & physical count** → stock and Inventory GL move together; shrinkage expense recorded.
10. **Void an invoice / a journal / a credit memo** → reversing entry created, inventory restored, original preserved, invariants hold.
11. **Tax payment** → Tax Payable↓, Cash↓; Tax Liability report reflects it.
12. **Payroll run** → balanced payroll entry; liabilities and net pay correct.
13. **Estimate→invoice and SO→invoice conversions** → only the invoice posts; lines carried through.
14. **Delivery loop** → deliver → approval queue → admin approves → stock commits; nothing commits before approval.
15. **Idempotency** → replaying a create/post request does not double-post.
16. **Period lock** → posting into a closed period is blocked.
17. **Tenant isolation** → company A cannot access company B's data on any endpoint.
18. **Role enforcement** → a delivery-personnel token is rejected by all financial endpoints.
19. **Concurrency** → two simultaneous payments on one invoice cannot overpay it.
20. **Money precision** → a long chain of taxed, discounted, split transactions leaves the Trial Balance off by exactly 0.
21. **Guided setup checklist** → a freshly created company shows the dashboard setup checklist; completing "Add Opening Balance" posts a balanced opening journal (offset to Opening Balance Equity) and marks that step done; a service-only company can skip inventory and still finish setup; once complete/dismissed the checklist hides but opening balances remain editable; Trial Balance balances throughout.

---

## 9. DELIVERABLES THE AGENT MUST PRODUCE

1. `AUDIT_REPORT.md` (Phase 0 findings).
2. The code changes across frontend + backend, in small reviewable commits per phase.
3. `ACCOUNTING_CONTRACT.md` — the as-built posting tables (this spec's §3, updated to match the real account codes/tables).
4. `BACKEND_API_CONTRACT.md` — every endpoint, its request/response shape, and which serializer consumes it.
5. The automated acceptance test suite (§8) and instructions to run it.
6. `PRODUCTION_CHECKLIST.md` — env config, migrations, backups, secrets, monitoring, build/release steps, maps setup, and a final green run of §8.
7. A short `CHANGELOG` summarizing what was fixed and any `FINMATRIX-REVIEW:` assumptions left for human sign-off.

---

## 10. ANTI-HALLUCINATION GUARDRAILS

- **Verify before you change.** Read the actual file/table; never assume a field, endpoint, or behavior exists — confirm it. Cross-check the frontend serializer against the real API response.
- **Don't fabricate accounting rules.** If this spec doesn't cover a case, use standard QuickBooks/GAAP behavior and flag it with `// FINMATRIX-REVIEW:`.
- **Don't delete to "fix."** Unreachable code or a failing feature gets wired up and corrected, not removed. The only thing you may remove is genuinely dead, duplicated, non-feature code — and only with a note.
- **Keep debits = credits sacred.** If a change would let the ledger go unbalanced, stop and redesign the change.
- **Stay in scope.** No new product features, no redesigns. Correctness, connectivity, and hardening only.

---

## Appendix A — Frontend → Backend endpoint contract surface (must all exist & match)

Accounts: `GET /accounts`, `GET /accounts/:id`, `GET /accounts/:id/transactions`, `POST /accounts`, `PATCH /accounts/:id`, `PATCH /accounts/:id/toggle`
Customers: `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`, `GET /customers/:id/invoices|payments|statement`
Vendors: `GET/POST /vendors`, `GET/PATCH/DELETE /vendors/:id`, `GET /vendors/:id/bills|payments`
Inventory: `GET/POST /inventory/items`, `GET/PATCH /inventory/items/:id`, `GET /inventory/items/:id/movements`, `POST /inventory/items/:id/adjust`, `POST /inventory/physical-counts`, `POST /inventory/transfers`
Invoices: `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id`, `POST /invoices/:id/send`, `POST /invoices/:id/void`, `GET /invoices/:id/pdf`
Payments: `GET/POST /payments`, `GET /payments/:id`, `GET /payments/customer/:id/outstanding`
Bills: `GET/POST /bills`, `GET/PATCH/DELETE /bills/:id`, `GET /bills/:id/payments`, `POST /bills/pay`
Purchase Orders: `GET/POST /purchase-orders`, `GET/PATCH/DELETE /purchase-orders/:id`, `POST /purchase-orders/:id/receive`, `POST /purchase-orders/:id/create-bill`
Estimates: `GET/POST /estimates`, `GET/PATCH/DELETE /estimates/:id`, `PATCH /estimates/:id/status`, `POST /estimates/:id/convert-to-invoice|convert-to-sales-order`
Sales Orders: `GET/POST /sales-orders`, `GET/PATCH /sales-orders/:id`, `POST /sales-orders/:id/convert-to-invoice|fulfill|cancel`
Credit Memos: `GET/POST /credit-memos`, `GET/DELETE /credit-memos/:id`, `POST /credit-memos/:id/apply|refund|void`
Vendor Credits: `GET/POST /vendor-credits`, `GET/DELETE /vendor-credits/:id`, `POST /vendor-credits/:id/apply|void`
Journal: `GET/POST /journal-entries`, `GET /journal-entries/:id`, `POST /journal-entries/:id/post|void`
Taxes: `GET/POST /taxes/rates`, `PATCH/DELETE /taxes/rates/:id`, `GET /taxes/liability`, `POST /taxes/payments`
Budgets: `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/:id`, `GET /budgets/:id/vs-actual`
Payroll: `GET/POST /payroll/runs`, `GET/DELETE /payroll/runs/:id`, `POST /payroll/runs/:id/process`, `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id`
Reports: `GET /reports/dashboard` (+ ADD: profit-loss, balance-sheet, trial-balance, general-ledger, cash-flow, ar-aging, inventory-valuation — all ledger-derived)
Deliveries: `GET/POST /deliveries`, `GET /deliveries/:id`, `GET /deliveries/my|my/dashboard|my/history|map-data`, `GET /deliveries/:id/location-history`, `POST /deliveries/assign`, `POST /deliveries/:id/auto-assign|confirm|issues|bill-photo`, `PATCH /deliveries/:id|/:id/status`
Delivery Personnel: `GET/POST /delivery-personnel`, `GET/PATCH /delivery-personnel/:id`, `PATCH /delivery-personnel/:id/availability`, `PATCH /delivery-personnel/location`, `GET /delivery-personnel/:id/location`, `POST /delivery-personnel/:id/reset-password`
Inventory Approvals / Shadow: `GET /inventory-approvals`, `GET /inventory-approvals/:id`, `PATCH /inventory-approvals/:id/review`, `GET /shadow-inventory`, `PATCH /shadow-inventory/:id`, `POST /shadow-inventory/sync/:personnelId`, `POST /inventory-update-requests/:id/undo`
Agencies: `GET/POST /agencies`, `GET/PATCH/DELETE /agencies/:id`, `GET/POST /agencies/:id/items`, `POST /agencies/:id/sync-inventory`
Auth/Company/Settings/Super-Admin/Audit/Notifications/Search: as listed in `src/network/*` — all must work and be tenant- and role-scoped.

*If any endpoint above is missing on the backend, the corresponding frontend feature is broken. Implement it to the documented contract — do not delete the feature.*