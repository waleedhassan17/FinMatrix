# FIVE_FEATURES_AUDIT.md — phase3.md Phase 0

**Date:** 2026-07-09 · file-level trace of both repos against the QuickBooks target flows.
> Note: the brief says "FIVE features" but lists four (Chart of Accounts, Employees & Payroll,
> Budgets, Bank Reconciliation) — this audit covers those four.

## 1. Chart of Accounts — ✅ works, two ⚠️

| QB requirement | Status | Evidence |
|---|---|---|
| Every account has a TYPE driving normal balance | ✅ | `account.entity.ts` `type: AccountType` (asset/liability/equity/income/expense) + `subType` (detail type) + `accountNumber` (unique per company). The posting engine applies **type-driven signed deltas** (`PostingService.applyPosting → signedDelta(acc.type, …)`), so liabilities/income accumulate credit-normal automatically. Reports (TB/BS/P&L) place by type. |
| Add / edit / DEACTIVATE, never hard-delete history | ✅ | `accounts.service.delete`: system accounts → `SYSTEM_ACCOUNT_PROTECTED`; **any GL history → `ACCOUNT_HAS_TRANSACTIONS` ("deactivate instead")**; children → blocked; only unused accounts hard-delete. Deactivate via `update isActive` / `toggle`. FE COADetail has the Deactivate/Activate action. |
| Balance shown, derived from the ledger | ✅/⚠️ | Cached `accounts.balance` is updated atomically by the posting engine (single-writer SQL increment) and shown on COAList/Detail. ⚠️ **COADetail "transactions" tab is a stub** — `accountTransactionModel.getAccountTransactions()` hardcodes `[]` while the real `GET /accounts/:id/transactions` endpoint + `getAccountTransactionsAPI` exist unused. Dead section. |
| Numbering | ✅ | `accountNumber` + FE `accountNumberUtils` suggestions. |
| ⚠️ Tier note | phase3.md says CoA + Bank Rec are ALL tiers. CoA already is. |

## 2. Employees & Payroll — ✅ core correct, four ⚠️

| QB requirement | Status | Evidence |
|---|---|---|
| Employee setup once (details, pay, deductions) | ✅ | `payroll.service` employees CRUD; payType salary/hourly, frequency, per-employee `deductionAmount`. FE EmployeeForm has all fields. |
| Run computes gross → deductions → net, review THEN post | ✅ | `createRun` → **draft** with per-employee items (gross/deductions/net + totals) → FE PayrollRunDetail shows figures → `processRun` posts. |
| Posts ONE balanced entry: Dr gross expense / Cr withheld liabilities / Cr net (payable or bank) | ✅ | `processRun` lines: **Dr 6200 Salary Expense (GROSS) / Cr 2300 Tax Payable (withheld) / Cr 1000 Cash (NET)** via the shared `PostingService` (rejects unbalanced). Gross is the expense; withholding is a liability, never income. Net→Bank is the allowed variant. |
| Remitting withheld tax later clears the payable | ✅ | existing `/taxes/payments` posts Dr 2300 / Cr Cash. |
| Payslip per employee | ⚠️ | run items ARE the per-employee figures, but there is **no payslip view** (per-employee breakdown to show/share). |
| Idempotent (a period can't double-post) | ⚠️ | `processRun` checks `status === 'paid'` but takes **no row lock** — two concurrent taps can both pass the check and double-post. Also nothing stops creating + processing a second run for the same `payPeriod`. |
| No hardcoded tax slabs | ⚠️ | per-employee amounts ✅, but `deductionFor()` **defaults to 10% of gross** when no deduction is set — a hardcoded rate. Should default to 0 with the user-entered amount as the only source (+ documented extension point for auto-calc). |
| History preserved | ⚠️ | `deleteEmployee` **hard-deletes** even when the employee has payroll items → orphans run history. Must block (deactivate instead). |
| Period lock | ✅ | posting goes through `PostingService` → `PERIOD_LOCKED` enforced. Tier-gated `@RequiresFeature('payroll')` ✅. |

## 3. Budgets — ✅ core correct, three ⚠️

| QB requirement | Status | Evidence |
|---|---|---|
| Budget per account, monthly across a fiscal year | ✅ | `budget_lines.monthlyAmounts[12]` per accountId; FE BudgetForm (annual ÷ 12) + Detail. |
| Budget vs Actual with variance, actuals from ledger | ✅/⚠️ | `budgetVsActual` reads GL per account with **normal-balance handling by type**; variance + %used computed. ⚠️ It compares **annual totals only** — no per-month breakdown even though monthly amounts are stored. ⚠️ Aggregation uses `parseFloat` (float), not Decimal. |
| Optionally pre-filled from prior actuals | ❌ | no prefill endpoint/UI. |
| Posts NOTHING | ✅ | service never imports PostingService; confirmed by chunk-era tests. Tier-gated `@RequiresFeature('budgets')` ✅. |

## 4. Bank Reconciliation — ✅ surprisingly complete, four ⚠️

| QB requirement | Status | Evidence |
|---|---|---|
| Pick bank account → ending balance + date | ✅ | `GET /reconciliations/accounts` (Cash/Bank subtypes only) → FE list → Reconcile screen with DateField + ending-balance input. |
| Beginning balance auto-rolls from prior reconciliation | ✅ | derived as Σ(debit−credit) of already-reconciled GL rows — equals the prior statement ending balance by construction. |
| Tick-to-clear, live difference, FINISH only at 0 | ✅ | FE computes Beginning/Cleared/Difference live, Finish disabled until \|diff\| < 0.005; **server re-verifies** and 400s `RECONCILIATION_OUT_OF_BALANCE` otherwise. |
| Posts NO journal entries; missing statement items entered as normal transactions | ✅ | `create()` only stamps `cleared` + `reconciliation_id` on GL rows; no PostingService anywhere. New transactions then appear to tick. |
| Mark reconciled + locked; not silently alterable | ✅ | GL is append-only by design (voids post reversals as NEW rows); reconciled rows keep their stamp. |
| Reconciliation report with outstanding items | ⚠️ | `getById` returns the cleared entries (the report core) but **no outstanding/uncleared list** as of the statement date. |
| History + admin undo | ✅ | list + detail = history; `DELETE /:id` is `@Roles('admin')`, latest-only (protects later beginning balances), audited via OperationalAudit. FE detail has Undo. |
| Warn when the beginning balance breaks | ⚠️ | no comparison of derived beginning vs the last reconciliation's statement ending balance → no warning path. |
| Statement-date ordering / cleared-entry dates | ⚠️ | `create` accepts a statement date **older than the last reconciliation** and cleared entries **dated after** the statement date — both should be rejected. |
| ⚠️ **Tier conflict** | phase3.md: Bank Rec is **ALL tiers**, but the tiering FEATURE_MAP currently sets `bankReconciliation: false` for small_business (and the SB navigator omits the screens). Must be updated. |

## 5. MODIFY-vs-NEW change list

**MODIFY (all changes are small targeted diffs):**
- BE `payroll.service.ts` — pessimistic lock + status guard in `processRun`; `deductionFor` default 10% → 0 (+ extension-point comment); `deleteEmployee` blocks when payroll history exists; `createRun` rejects a duplicate payPeriod that already has a PAID run; Decimal-safe.
- BE `budgets.service.ts` — `budgetVsActual` adds per-month rows (budget vs monthly GL actuals) and switches float math → Decimal; new `prefill` method reading prior-year monthly actuals.
- BE `budgets.controller.ts` — `GET /budgets/prefill` route.
- BE `reconciliations.service.ts` — `getUnreconciled` returns `lastStatementEndingBalance` + `beginningMismatch` warning; `create` rejects out-of-order statement dates + cleared entries dated after the statement; `getById` adds the outstanding-items list.
- BE `common/features/feature-map.ts` — small_business `bankReconciliation: true` (phase3.md overrides the earlier tier placement).
- BE `test/tiering.acceptance.ts` — SB `/reconciliations` expectation 403 → 200.
- FE `navigators/tiers/tierRoutes.tsx` — Bank Rec screens into SB_MORE_ROUTES; `MoreHubScreen` row stays feature-tagged (flag now true everywhere).
- FE `COADetailScreen.tsx` + `accountTransactionModel/coaListSlice` — wire the transactions tab to the real `GET /accounts/:id/transactions`.
- FE `PayrollRunDetailScreen.tsx` — per-employee payslip modal (tap a row → gross/deductions/net breakdown + share) + processed-state polish.
- FE `BudgetFormScreen.tsx` — "Pre-fill from last year's actuals" action; `BudgetDetailScreen` monthly variance rows.
- FE `BankReconciliationScreen.tsx` — beginning-balance-mismatch warning banner; `BankReconciliationDetailScreen` outstanding-items section.
- BE `test/acceptance.ts` or new `test/five-features.acceptance.ts` — the Phase 3 acceptance scenarios.

**NEW (genuinely absent):**
- BE `budgets` prefill method/route (small addition inside existing files — no new module).
- BE `test/five-features.acceptance.ts` (new test file).
- FE payslip modal component (inside PayrollRunDetail — no new screen).

**Explicitly NOT touched:** `PostingService` internals, invoice/bill/payment logic, the tiering guard machinery (only the one FEATURE_MAP value), migrations (no schema change needed — all fixes are logic-level).

— END OF AUDIT — per your instruction ("start implementing each and everything") proceeding directly to Phase 1.
