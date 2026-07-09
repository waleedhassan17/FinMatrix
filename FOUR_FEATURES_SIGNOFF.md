# SIGN-OFF SHEET — phase3.md four features vs QuickBooks flows

**Date:** 2026-07-09 · verified by `npm run test:five-features` (**49/49 ✓** on a fresh company,
exact amounts) plus the regression suites. Every check below is automated and re-runs on every build.

## 1 · Chart of Accounts

| Expected (QuickBooks flow) | Actual | |
|---|---|---|
| Every account has a TYPE + optional detail type + optional number | `type` (asset/liability/equity/income/expense) validated, `subType` validated per type (`INVALID_SUB_TYPE` otherwise), unique `accountNumber` | ✅ |
| Type drives the normal balance | Posted Dr Cash 5,000 / Cr Loan Payable 5,000 → the **liability balance INCREASED by 5,000** (credit-normal, applied by the posting engine's `signedDelta`) | ✅ |
| Deactivate, never hard-delete history | Delete on an account with postings → `400 ACCOUNT_HAS_TRANSACTIONS`; deactivate (isActive=false) works; system accounts always protected | ✅ |
| Balance derived from the ledger | Cached balance maintained atomically by the posting engine; `GET /accounts/:id/transactions` returns the GL rows — now actually wired into the app's COA detail (was an empty stub) | ✅ |

## 2 · Employees & Payroll

| Expected | Actual | |
|---|---|---|
| Set up employee once (pay, deductions) | salary/hourly + frequency + per-employee withholding amount | ✅ |
| Run computes gross → deductions → net, shows for review | Run created as **draft**: 120,000/12 + 60,000/12 = **gross 15,000**, deductions **1,500** (only the configured amount), **net 13,500** — nothing posted at review | ✅ |
| Posts ONE balanced entry | **Dr 6200 Salary Expense 15,000 (GROSS) / Cr 2300 Tax Payable 1,500 (withheld = LIABILITY) / Cr 1000 Cash 13,500 (NET)** — Trial Balance balanced after ✅ balanced | ✅ |
| No hardcoded tax slabs | Employee with no configured deduction withholds **0** (the old 10% default is gone); documented extension point for auto-calc | ✅ |
| Payslip per employee | Run detail rows → tap → payslip breakdown (gross / withheld / net) with share | ✅ |
| Idempotent | Concurrent double-tap: **exactly one** process succeeds (row-locked); re-process → 400; re-creating an already-PAID period → `PERIOD_ALREADY_PAID` | ✅ |
| Period lock respected | Process into a locked period → rejected by the posting engine | ✅ |
| Paying/remitting clears payables | Tax payment posts Dr 2300 / Cr Cash → payable back to prior balance | ✅ |
| History preserved | Deleting an employee on a payroll run → `EMPLOYEE_HAS_PAYROLL_HISTORY` (deactivate instead) | ✅ |

## 3 · Budgets

| Expected | Actual | |
|---|---|---|
| Budget per account, monthly across a fiscal year | 12 monthly amounts per account line | ✅ |
| Budget vs Actual with variance | Actuals from the ledger with normal-balance signs: budget 24,000, actual 15,000, **variance 9,000**; **NEW monthly breakdown** per account (current month: budget 2,000 vs actual 15,000) — expandable in the app | ✅ |
| Optionally pre-filled from prior actuals | `GET /budgets/prefill` returns per-account monthly actuals (15,000 verified); "Pre-fill from last year" button in the budget form keeps monthly seasonality | ✅ |
| Posts NOTHING | GL row count identical before/after budget + vs-actual + prefill | ✅ |
| Money as decimal | vs-actual/prefill aggregation moved from float to Decimal | ✅ |

## 4 · Bank Reconciliation

| Expected | Actual | |
|---|---|---|
| Ending balance + date, beginning auto-rolls | Beginning 0 on first run; after finishing, the next reconciliation's **beginning = prior statement ending** | ✅ |
| Tick-to-clear, live difference, finish only at 0 | App computes the difference live and disables Finish; server re-verifies: wrong ending balance → `RECONCILIATION_OUT_OF_BALANCE`, exact → finishes with difference 0.00 | ✅ |
| **Posts NO journal entries** | GL row count identical across finish AND undo; missing statement items are entered as normal transactions which then appear to tick | ✅ |
| Cleared transactions reconciled + locked | Cleared rows leave the unreconciled list (stamped with the reconciliation id); GL is append-only so they can't be silently altered | ✅ |
| Reconciliation report with outstanding items | Report = summary + cleared entries + **Outstanding Items with uncleared total** (verified: an uncleared 700 payment listed) | ✅ |
| History + admin undo | List + detail per past reconciliation; undo is admin-only, **latest-only** (protects later beginning balances), audited; undone rows return to the unreconciled list | ✅ |
| Warn on broken beginning balance | `beginningMismatch` returned when derived beginning ≠ last statement ending → red banner in the app | ✅ |
| Ordering | Statement dated **before** the last reconciliation → `RECONCILIATION_OUT_OF_ORDER`; same-day catch-up allowed (undo order tie-breaks by creation time); cleared entries dated after the statement → rejected | ✅ |
| Tier | Bank Reconciliation now available on **every tier** (core feature per phase3.md) | ✅ |

## Verification summary

| Check | Result |
|---|---|
| `npm run test:five-features` (new) | **49/49 ✓** |
| `npm run test:chunk2` (accounting parity incl. bank rec §13) | 89/89 ✓ |
| `npm run test:tiering` | 83/83 ✓ |
| `npm run test:acceptance` (core + delivery E2E) | 135/135 ✓ |
| `npx jest` (unit specs) | 31/31 ✓ |
| `npx tsc --noEmit` backend / frontend | 0 errors / 0 src errors |
| `npm run build` backend | clean |
| Accounting core (`PostingService`) | **untouched** — every fix sits at the service/controller boundary |
| Schema | **no migration needed** (logic-level changes only) |

## Ready-to-run deploy commands (NOT executed — per phase3.md, run these yourself)

```bash
# 0) BACKUP FIRST — this touches a production accounting DB
heroku pg:backups:capture -a finmatrix-api-prod
heroku pg:backups -a finmatrix-api-prod            # confirm the new backup shows "Completed"

# 1) Push to GitHub
cd ~/FinMatrix-Backend/FinMatrix-Backend && git push origin main
cd ~/FinMatrix && git push origin main

# 2) Deploy backend (this app deploys via git push to the heroku remote,
#    not GitHub auto-deploy)
cd ~/FinMatrix-Backend/FinMatrix-Backend && git push heroku main

# 3) Migration on Heroku: NONE required for this release (no schema change).
#    If you want to re-assert the idempotent schema anyway:
heroku run "node dist/database/apply-tiering-schema.js" -a finmatrix-api-prod

# 4) Post-deploy smoke
curl -s https://finmatrix-api-prod-665c6b5cb6a1.herokuapp.com/api/v1/health
```
Rollback: `heroku rollback` (previous release), or `git revert de2ea95 ddb01d0` (backend) /
`git revert 670a61a` (frontend) — no schema to unwind.
