ROLE: Act as a senior full-stack engineer + accountant, shipping production software. Work across
FinMatrix (React Native + Expo, Redux Toolkit) and FinMatrix-Backend (NestJS + TypeORM + PostgreSQL,
on Heroku). All FIVE features below ALREADY EXIST in FinMatrix — this is an AUDIT + HARDENING pass to make
them production-ready and their flows IDENTICAL to QuickBooks. Do NOT rebuild from scratch: find the
existing code and update/complete/correct it with small targeted diffs. Never break the accounting engine;
Trial Balance and Balance Sheet must always balance. These features are Large-Org/Warehouse tier (Chart of
Accounts + Bank Rec are core/all-tier); gate payroll and budgets behind the existing feature flags.
Work in phases; STOP after Phase 0 for review.

FEATURES: 1) Chart of Accounts  2) Employees & Payroll  3) Budgets  4) Bank Reconciliation
(Note: Chart of Accounts and Bank Reconciliation are available to all tiers; Payroll and Budgets are
Large-Org/Warehouse only.)

QUICKBOOKS TARGET FLOWS (match these exactly):
- CHART OF ACCOUNTS: every account has a TYPE (asset/liability/equity/income/expense) + optional detail
  type and optional number; type drives normal balance and report placement. Add/edit/DEACTIVATE (never
  hard-delete — preserve history). Each account shows its current balance (derived from the ledger).
- EMPLOYEES & PAYROLL: set up employee once (details, pay, deductions). Each period "run payroll" computes
  gross → tax/deductions → net, shows figures for review, then POSTS one balanced entry: Dr Wage/Salary
  Expense (GROSS) / Cr Tax Payable (withheld) / Cr other deduction payables / Cr Net Pay Payable (or Bank).
  Generate a payslip per employee. Paying staff + remitting tax later clears the payables. The GROSS is the
  expense; withheld tax is a LIABILITY, never income. (Do NOT hardcode Pakistani FBR tax slabs — let the
  user enter tax/deductions per employee; leave an extension point for auto-calc later.)
- BUDGETS: create a budget PER ACCOUNT, by period (monthly across a fiscal year), optionally pre-filled from
  prior actuals. A "Budget vs Actual" report compares budget to ledger actuals and shows variance. A budget
  POSTS NOTHING to the ledger.
- BANK RECONCILIATION: pick a bank account → enter statement ENDING BALANCE + ENDING DATE (beginning balance
  auto-rolls from the prior reconciliation's ending balance) → list uncleared book transactions → user
  TICKS each transaction matching the statement; the cleared balance and the DIFFERENCE update live → the
  reconciliation can only FINISH when Difference = 0 → on finish, mark those transactions reconciled/locked
  and produce a RECONCILIATION REPORT (with outstanding/uncleared items listed). RULES: reconciliation posts
  NO journal entries (it only marks transactions cleared); a statement item missing from the books is added
  as a NORMAL transaction (which then appears to be ticked); a book item not on the statement is left
  unticked (uncleared, carries forward); a reconciled transaction must not be silently altered (warn if the
  beginning balance breaks); support viewing past reconciliation reports (history) and undo a reconciliation
  (admin).

============================ PHASE 0 — AUDIT (produce FIVE_FEATURES_AUDIT.md, then STOP) ============================
For EACH of the five features, trace the existing implementation in both repos (screens/routes/slices +
modules/controllers/services/entities) and report ✅ works / ⚠️ partial / ❌ missing vs. the QuickBooks
flow above. Specifically check and report:
- Chart of Accounts: does every account have a type driving normal balance? Deactivate vs hard-delete?
  Balance shown from the ledger?
- Payroll: what journal entry does a run currently post, and does it BALANCE with gross-as-expense and
  withheld-tax-as-liability? Payslips? Idempotent? Period-lock respected?
- Budgets: per-account-by-period? Budget vs Actual variance report? Confirm it posts nothing.
- Bank Rec: does it enter ending balance/date, tick-to-clear with a live difference, finish only at zero,
  produce a report, roll the beginning balance, and post NO journal entries? History/undo?
Give a MODIFY-vs-NEW file-by-file change list (MODIFY should dominate). Output, then STOP for approval.

============================ PHASE 1 — HARDEN EACH FEATURE TO THE QUICKBOOKS FLOW ============================
Fix every ⚠️/❌ from the audit so each feature matches the target flow above. Key correctness gates:
- CHART OF ACCOUNTS: enforce type-driven normal balance; deactivate (not delete) accounts that have
  history; show ledger-derived balances; allow numbering. Existing postings unaffected.
- PAYROLL: the run posts exactly the balanced entry above (gross expense; tax/deductions as liabilities;
  net as payable/bank); review-before-post; payslips; idempotent (re-running a period can't double-post);
  respects period lock. Paying/remitting clears payables.
- BUDGETS: per-account monthly budgets; Budget vs Actual pulls actuals from the ledger; variance correct;
  posts nothing.
- BANK RECONCILIATION: implement/confirm the exact tick-to-zero flow; beginning balance rolls from prior
  reconciliation; finish only at difference = 0; mark transactions reconciled + lock; generate a
  reconciliation report; list outstanding items; history + admin undo; warn on broken beginning balance;
  post NO journal entries (missing items are added as normal transactions, which then appear to tick).
Every change is additive/targeted; do NOT edit the posting engine internals — gate/wrap at boundaries.

============================ PHASE 2 — PRODUCTION HARDENING ============================
- All five: no mock data, no dead buttons, loading/empty/error states, server-side validation, tenant-
  scoped (companyId from JWT), and (payroll/budgets) tier-gated with 403 for wrong tiers.
- Money as decimal (never float); rounding consistent; period lock respected on all postings.

============================ PHASE 3 — TEST, VERIFY, PREPARE DEPLOY ============================
- Add acceptance tests: payroll run posts a balanced entry (gross=expense, tax=liability) and Trial Balance
  balances; payroll idempotency; budget posts nothing and variance is correct; CoA deactivate preserves
  history and type drives normal balance; bank rec ticks to zero, finishes, posts no journal entries, rolls
  beginning balance, and locks reconciled items. All green in CI.
- `npx tsc --noEmit` clean both repos; backend `npm run build` succeeds.
- DEPLOY PREP (do NOT auto-deploy): commit in small reviewable commits. Then PRINT for me to run: the git
  push commands; the Heroku deploy step (detect whether it's `git push heroku main` or GitHub auto-deploy);
  the command to run the new migration on Heroku; and a reminder to capture a DB backup
  (`heroku pg:backups:capture -a <app>`) BEFORE the migration, since this touches a production accounting DB.

DELIVERABLES: FIVE_FEATURES_AUDIT.md; small commits per phase; the five hardened features matching the
QuickBooks flows; the acceptance tests; a SIGN-OFF SHEET per feature (expected flow vs actual, with the
payroll debit/credit shown balanced ✅ and the bank-rec "difference reaches zero, posts nothing" confirmed);
and the ready-to-run git + Heroku deploy/migration/backup commands. Confirm: accounting core untouched,
payroll balances, budgets post nothing, bank rec posts nothing and finishes only at zero, CoA types drive
normal balances, tsc + build + acceptance green.