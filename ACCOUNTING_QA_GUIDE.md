# FinMatrix — Accounting Audit & QA Guide

**Audited:** 13 Aug 2026 · app `269483e` · api `bbf0f0e`
**Scope:** `FinMatrix` (Expo/RN app, 120 screens) + `FinMatrix-Backend` (NestJS/TypeORM/Postgres, 36 modules, 76 tables)
**Method:** source audit of both repos + **live queries against the production database**

---

## 0. How to use this guide

| Section | Use it when |
|---|---|
| [1. Audit verdict](#1-audit-verdict) | You want to know what is solid and what blocks release |
| [2. The invariants](#2-the-invariants-run-these-first) | Every single test run — these must never break |
| [3. Feature QA protocol](#3-feature-by-feature-qa-protocol) | Testing or signing off one module |
| [4. Tier matrix](#4-tier-test-matrix) | Deciding what to test per company type |
| [5. Release gate](#5-production-readiness-gate) | Go / no-go decision |

Every test below has a **DB verification query**. A feature is not "tested" because the screen looked right — it is tested when the ledger proves it. That is the difference between QA on an app and QA on an accounting system.

---

## 1. Audit verdict

### 1.1 What is genuinely production-grade

These are **verified facts**, not code-reading impressions — each was confirmed against the live database.

| # | Finding | Evidence |
|---|---|---|
| 1 | **Double-entry actually balances.** Total debits = total credits exactly | 6,464,326.3333 = 6,464,326.3333, difference `0.0000` across 287 lines |
| 2 | **Zero unbalanced journal entries** | 0 rows from `GROUP BY entry_id HAVING sum(debit)<>sum(credit)` over 119 entries |
| 3 | **Accounting equation holds per company** | All 3 companies satisfy A = L + E + (Rev − Exp) to the cent |
| 4 | **No float money anywhere** | Every monetary column is `numeric(18,4)`; engine uses `decimal.js` |
| 5 | **One central posting path** | `modules/journal-entries/posting.service.ts` — 15 modules post through it, none bypass it |
| 6 | **Balance is enforced before persist** | `UNBALANCED_ENTRY` thrown when `!moneyEquals(totalDebits, totalCredits)` |
| 7 | **Line shape validated** | Exactly one of debit/credit > 0, non-negative, ≥ 2 lines per entry |
| 8 | **Period lock enforced centrally** | `assertPeriodOpen()` runs inside the posting engine, so *every* document type is covered automatically |
| 9 | **Journal entries are immutable** | Service exposes `void()` only — no `update`, no `delete`. Reversals via `reversal_of_id` |
| 10 | **Reports read the GL, not subledgers** | `reports.service.ts` queries `general_ledger` joined to `accounts` |
| 11 | **No denormalised balance drift** | All 26 accounts with activity: stored `balance` matches ledger lines exactly (normal-balance aware) |
| 12 | **Subledger integrity clean** | 0 invoices where `total − amount_paid ≠ balance`; 0 paid-with-balance; 0 negative stock; 0 over-applied payments |
| 13 | **Race-safe numbering** | `nextJournalReference()` takes a pessimistic row lock on the company |
| 14 | **Tenancy + feature gating at the boundary** | `CompanyGuard` / `FeatureGuard` at controllers; accounting core deliberately never gated |

> **Bottom line: the ledger engine is sound.** This is a real double-entry system, not a CRUD app with an "accounts" table. The issues below are about *coverage and controls*, not about the core being wrong.

### 1.2 Blocking gaps

| # | Severity | Gap | Why it matters |
|---|---|---|---|
| **G1** | 🔴 **Critical** | **Zero `CHECK` constraints in the entire schema** (confirmed: `pg_constraint contype='c'` returns no rows) | Balance is enforced *only* in application code. Any path that bypasses `PostingService` — a raw query, a seed script, a future developer, a migration — can write unbalanced data and nothing stops it. The database has no opinion about whether your books balance. |
| **G2** | 🔴 **Critical** | **`audit_trail` table exists, has 0 rows, and has no writer anywhere in the codebase** | `auditLog` is an advertised feature for `large_org` and `warehouse` tiers. An accounting system that cannot say who changed what, when, fails basic auditability and most compliance reviews. |
| **G3** | 🔴 **Critical** | **4 GL-wired modules have never been exercised: `credit_memos`, `vendor_credits`, `inventory_adjustments`, `tax_payments` — all 0 rows** | The code paths exist and have `journal_entry_id` FKs, but no transaction has ever flowed through them in production. These are entirely unproven. Credit memos and vendor credits are how you correct mistakes — a broken correction path is worse than a broken entry path. |
| **G4** | 🟠 High | **Period close never exercised** — `books_locked_until` is `NULL` on all 3 companies | The lock logic reads correctly but has never run against real data. Year-end close is the single highest-risk accounting operation. |
| **G5** | 🟠 High | **No automated test covers any accounting behaviour** | 8 spec files exist, covering auth, company status, feature map, plan config and the new phone validation. Nothing asserts that an invoice produces the right debits and credits. |
| **G6** | 🟠 High | **Inventory costing method may be partially implemented** | `costMethod` accepts `fifo \| lifo \| average`, but the only implementation evidence found is weighted-average. Shipping a `fifo` option that silently behaves as average is a misstatement of inventory and COGS. |
| **G7** | 🟡 Medium | **Void/reversal path barely used** — 1 reversal, 0 voids across 119 entries | The correction mechanism is the safety net. It needs deliberate testing. |
| **G8** | 🟡 Medium | **Cash vs accrual basis unverified** | `companies.accounting_method` exists (`cash`/`accrual`). Whether reports honour it is untested. QuickBooks treats this as a report-level toggle. |

---

## 2. The invariants (run these first)

These twelve statements must be true **before and after every test session**, on every environment. If any fails, stop and fix — do not continue testing on top of a broken ledger.

Save as `qa/invariants.sql` and run with `psql -f qa/invariants.sql`. This block is self-contained — no placeholders — so it runs as-is. **Verified: all twelve execute cleanly and return zero rows against production as of this audit.**

(The queries in §3 do use `:c` / `:doc` placeholders — substitute a real company/document id before running those.)

```sql
-- ═══════════════════════════════════════════════════════
-- FinMatrix ledger invariants. Every query must return ZERO rows.
-- Any row returned is a defect.
-- ═══════════════════════════════════════════════════════

-- I1. Global double-entry: total debits must equal total credits
SELECT 'I1 GLOBAL IMBALANCE' AS violation, sum(debit) AS dr, sum(credit) AS cr
FROM journal_entry_lines HAVING sum(debit) <> sum(credit);

-- I2. Every individual entry must balance
SELECT 'I2 UNBALANCED ENTRY' AS violation, entry_id,
       sum(debit) dr, sum(credit) cr
FROM journal_entry_lines GROUP BY entry_id HAVING sum(debit) <> sum(credit);

-- I3. Stored entry totals must match the sum of their lines
SELECT 'I3 HEADER/LINE MISMATCH' AS violation, e.id, e.reference
FROM journal_entries e
JOIN (SELECT entry_id, sum(debit) d, sum(credit) c
      FROM journal_entry_lines GROUP BY entry_id) l ON l.entry_id = e.id
WHERE e.total_debits <> l.d OR e.total_credits <> l.c;

-- I4. No line may carry both a debit and a credit, or neither
SELECT 'I4 BAD LINE SHAPE' AS violation, id, debit, credit
FROM journal_entry_lines
WHERE (debit > 0 AND credit > 0) OR (debit = 0 AND credit = 0)
   OR debit < 0 OR credit < 0;

-- I5. Accounting equation per company: A = L + E + (Rev - Exp)
SELECT 'I5 EQUATION BROKEN' AS violation, company_id, assets, liab_eq_income
FROM (
  SELECT a.company_id,
    sum(CASE WHEN a.type='asset' THEN l.debit-l.credit ELSE 0 END)::numeric(18,4) assets,
    ( sum(CASE WHEN a.type='liability' THEN l.credit-l.debit ELSE 0 END)
    + sum(CASE WHEN a.type='equity'    THEN l.credit-l.debit ELSE 0 END)
    + sum(CASE WHEN a.type='revenue'   THEN l.credit-l.debit ELSE 0 END)
    - sum(CASE WHEN a.type='expense'   THEN l.debit-l.credit ELSE 0 END))::numeric(18,4) liab_eq_income
  FROM journal_entry_lines l JOIN accounts a ON a.id=l.account_id
  GROUP BY a.company_id
) t WHERE assets <> liab_eq_income;

-- I6. Denormalised account balances must match the ledger (normal-balance aware)
SELECT 'I6 BALANCE DRIFT' AS violation, a.name, a.type, a.balance stored
FROM accounts a JOIN journal_entry_lines l ON l.account_id=a.id
GROUP BY a.id, a.name, a.type, a.balance
HAVING a.balance <> CASE WHEN a.type IN ('asset','expense')
                         THEN sum(l.debit-l.credit) ELSE sum(l.credit-l.debit) END;

-- I7. Every posted document must carry a journal entry
SELECT 'I7 UNPOSTED INVOICE' AS violation, invoice_number FROM invoices
 WHERE journal_entry_id IS NULL AND status <> 'draft'
UNION ALL SELECT 'I7 UNPOSTED BILL', bill_number FROM bills
 WHERE journal_entry_id IS NULL AND status <> 'draft'
UNION ALL SELECT 'I7 UNPOSTED PAYMENT', id::text FROM payments
 WHERE journal_entry_id IS NULL;

-- I8. Invoice arithmetic: total - paid = balance
SELECT 'I8 INVOICE MATH' AS violation, invoice_number, total, amount_paid, balance
FROM invoices WHERE total - amount_paid <> balance;

-- I9. Status must agree with balance
SELECT 'I9 STATUS/BALANCE' AS violation, invoice_number, status, balance
FROM invoices
WHERE (status='paid' AND balance <> 0) OR (status='sent' AND balance = 0 AND total > 0);

-- I10. Payments may never be over-applied
SELECT 'I10 OVER-APPLIED' AS violation, p.id, p.amount, sum(pa.amount_applied) applied
FROM payments p JOIN payment_applications pa ON pa.payment_id=p.id
GROUP BY p.id, p.amount HAVING sum(pa.amount_applied) > p.amount;

-- I11. Stock may never go negative
SELECT 'I11 NEGATIVE STOCK' AS violation, sku, name, quantity_on_hand
FROM inventory_items WHERE quantity_on_hand < 0;

-- I12. Nothing may post into a closed period
SELECT 'I12 CLOSED-PERIOD POSTING' AS violation, e.reference, e.date, c.books_locked_until
FROM journal_entries e JOIN companies c ON c.id=e.company_id
WHERE c.books_locked_until IS NOT NULL AND e.date <= c.books_locked_until
  AND e.status='posted';
```

**Current status:** I1–I12 all pass on production as of this audit. Note I12 is currently *vacuous* — it can only catch anything once a company actually has `books_locked_until` set, and none do (see G4). Treat it as unproven, not as passing.

---

## 3. Feature-by-feature QA protocol

### How to read each block

- **Expected posting** — the debits and credits that MUST appear. This is the accounting acceptance criterion.
- **QuickBooks parity** — how QB behaves, so you can judge whether a difference is a bug or a deliberate choice.
- **Verify** — the SQL that proves it.

Throughout: `:c` = company id, `:doc` = the document id you just created.

---

### 3.1 Chart of Accounts

**Principle.** Five account types with fixed normal balances. Assets and expenses are debit-normal; liabilities, equity and revenue are credit-normal. Getting this wrong inverts every report.

| Test | Steps | Pass criteria |
|---|---|---|
| COA seeded on company creation | Create a new company | Default accounts exist with correct `type` per account. Currently 57 accounts across 3 companies |
| Normal balance respected | Post to one account of each type | Debit-normal accounts increase on debit; credit-normal on credit |
| Account cannot be deleted with activity | Try deleting an account that has ledger lines | Rejected — QB deactivates instead of deleting |
| Inactive account rejected | Deactivate an account, then post to it | `ACCOUNT_INACTIVE` error (verified: enforced in `posting.service.ts`) |
| Cross-company isolation | Post to another company's account id | `ACCOUNT_NOT_FOUND` (verified: accounts fetched with `companyId` filter) |

**QuickBooks parity.** QB never hard-deletes accounts with history — it makes them inactive and keeps the ledger intact. Verify FinMatrix does the same.

```sql
SELECT type, count(*) FROM accounts WHERE company_id=:c GROUP BY type;
```

---

### 3.2 Invoices (Accounts Receivable)

**Expected posting** — on issue (accrual basis):

```
Dr  Accounts Receivable        total
    Cr  Sales Revenue                    subtotal - discount
    Cr  Sales Tax Payable                tax_amount
```
Plus, when the line items are inventory items:
```
Dr  Cost of Goods Sold         cost
    Cr  Inventory                        cost
```

| # | Test | Expected |
|---|---|---|
| 1 | Create draft invoice | **No** GL posting. Drafts never hit the ledger |
| 2 | Issue/send the invoice | JE created; `invoices.journal_entry_id` set; I1–I3 still pass |
| 3 | Invoice with tax | Tax credited to Sales Tax Payable **separately** from revenue — never lumped into revenue |
| 4 | Invoice with discount | Revenue credited **net** of discount, or discount posted to a contra-revenue account. Not both |
| 5 | Inventory invoice | COGS debited and Inventory credited at cost, in the **same** entry date as the revenue (matching principle) |
| 6 | Zero-total invoice | Rejected, or posts nothing. Never a one-sided entry |
| 7 | Negative line | Rejected unless it is a credit memo |
| 8 | Backdate into closed period | `PERIOD_LOCKED` |
| 9 | Edit a posted invoice | Must reverse + repost, or be blocked. **Never** silently mutate the original JE |
| 10 | Void a posted invoice | Reversing entry created; AR returns to zero; original entry preserved |

**QuickBooks parity.** QB posts the invoice on its **invoice date**, not the created date — check FinMatrix uses `invoice_date` for the JE date, not `now()`. QB also refuses to delete an invoice with payments applied.

```sql
-- The full posting for one invoice
SELECT a.name, a.type, l.debit, l.credit
FROM invoices i JOIN journal_entry_lines l ON l.entry_id=i.journal_entry_id
JOIN accounts a ON a.id=l.account_id WHERE i.id=:doc ORDER BY l.line_order;

-- AR control account must equal the sum of open invoices
SELECT (SELECT sum(balance) FROM invoices WHERE company_id=:c AND status<>'draft') AS ar_subledger,
       (SELECT sum(l.debit-l.credit) FROM journal_entry_lines l JOIN accounts a ON a.id=l.account_id
        WHERE a.company_id=:c AND a.name ILIKE '%receivable%') AS ar_control;
```
> **The subledger must equal the control account.** This single reconciliation catches most AR bugs.

---

### 3.3 Payments received

**Expected posting:**
```
Dr  Bank / Undeposited Funds   amount
    Cr  Accounts Receivable            amount
```
Revenue is **never** touched again — it was recognised at invoice time. If you see revenue move on payment, the system is double-counting income.

| # | Test | Expected |
|---|---|---|
| 1 | Full payment | Invoice `balance` → 0, `status` → paid, AR credited |
| 2 | Partial payment | `balance` = total − paid; status stays open |
| 3 | Overpayment | Rejected, or credit balance created. Never a negative AR silently |
| 4 | Payment across several invoices | Sum of applications = payment amount (I10) |
| 5 | Payment before invoice date | Allowed but flagged; must not break period lock |
| 6 | Delete/void a payment | AR restored, invoice reopens, reversing entry written |
| 7 | Duplicate submit | Idempotency respected — one payment, not two. (`idempotency_records` table exists — verify it is used here) |

**QuickBooks parity.** QB routes receipts through **Undeposited Funds** until a deposit is made, then moves them to the bank account. FinMatrix posts straight to cash/bank. That is a legitimate simplification — but confirm it is deliberate, because it changes bank reconciliation behaviour.

---

### 3.4 Bills & bill payments (Accounts Payable)

**Bill:**
```
Dr  Expense (or Inventory)     net
Dr  Recoverable Input Tax      tax          (if reclaimable)
    Cr  Accounts Payable               total
```
**Bill payment:**
```
Dr  Accounts Payable           amount
    Cr  Bank                           amount
```

| # | Test | Expected |
|---|---|---|
| 1 | Bill with expense lines | Expense debited, AP credited |
| 2 | Bill with inventory lines | **Inventory** debited (an asset), not expense. Expense only on sale, via COGS |
| 3 | Bill against a PO | Three-way match: PO → receipt → bill. GRNI cleared, not double-counted |
| 4 | Partial bill payment | AP reduced by exactly the amount paid |
| 5 | Pay in a closed period | `PERIOD_LOCKED` |
| 6 | AP subledger vs control | Must be equal |

```sql
SELECT (SELECT sum(balance) FROM bills WHERE company_id=:c AND status<>'draft') AS ap_subledger,
       (SELECT sum(l.credit-l.debit) FROM journal_entry_lines l JOIN accounts a ON a.id=l.account_id
        WHERE a.company_id=:c AND a.name ILIKE '%payable%' AND a.name NOT ILIKE '%tax%') AS ap_control;
```

---

### 3.5 Credit memos & vendor credits 🔴 **G3 — zero production rows, entirely unproven**

**Customer credit memo** (reduces what a customer owes):
```
Dr  Sales Returns / Revenue    net
Dr  Sales Tax Payable          tax
    Cr  Accounts Receivable            total
```
Plus on restock: `Dr Inventory / Cr COGS`.

**Vendor credit** (reduces what you owe a supplier):
```
Dr  Accounts Payable           total
    Cr  Expense or Inventory           net
    Cr  Recoverable Input Tax          tax
```

| # | Test | Expected |
|---|---|---|
| 1 | Credit memo against a specific invoice | AR reduced; invoice balance drops; I1–I3 hold |
| 2 | Standalone credit memo | Creates a customer credit balance |
| 3 | Apply credit to a later invoice | AR moves, no revenue impact on application |
| 4 | Credit memo with restock | Inventory returns at **original cost**, not sale price |
| 5 | Credit exceeding invoice | Rejected or leaves an explicit credit balance |
| 6 | Tax reversal | Sales Tax Payable reduced proportionally — a common bug is forgetting this |
| 7 | Same six tests for vendor credits | Mirror behaviour on the AP side |

> **Test these first.** They are the correction mechanism, they have never run, and errors here silently misstate both revenue and tax.

---

### 3.6 Inventory & COGS 🔴 **G3/G6 — adjustments unproven, costing method unverified**

**Principle.** Inventory is an **asset** until sold. On sale it becomes COGS. Purchases never hit expense directly.

| # | Test | Expected |
|---|---|---|
| 1 | Confirm the costing method actually implemented | Set `costMethod` to `fifo`, buy at 100 then 120, sell one. COGS must be **100**. If it is 110, FIFO is not implemented — see G6 |
| 2 | Weighted average | Buy 10@100 + 10@120 → unit cost 110. Sell 5 → COGS 550, Inventory 1650 |
| 3 | Purchase receipt | `Dr Inventory / Cr GRNI or AP` |
| 4 | Sale | `Dr COGS / Cr Inventory` at cost, same date as revenue |
| 5 | Write-down adjustment | `Dr Shrinkage Expense / Cr Inventory` |
| 6 | Write-up adjustment | Reverse. Must be justified — most standards forbid writing inventory above cost |
| 7 | Physical count variance | Posts an adjustment; does not silently overwrite quantity |
| 8 | Stock transfer between locations | Quantity moves; **no P&L impact** (`stock_transfers` has no `journal_entry_id` — correct, but verify no cost leakage) |
| 9 | Negative stock | Blocked (I11) |

```sql
-- Inventory subledger vs the Inventory control account
SELECT (SELECT sum(quantity_on_hand*unit_cost) FROM inventory_items WHERE company_id=:c) AS stock_value,
       (SELECT sum(l.debit-l.credit) FROM journal_entry_lines l JOIN accounts a ON a.id=l.account_id
        WHERE a.company_id=:c AND a.name ILIKE '%inventory%') AS inventory_control;
```

---

### 3.7 Manual journal entries

| # | Test | Expected |
|---|---|---|
| 1 | Unbalanced entry | `UNBALANCED_ENTRY` — ✅ verified enforced |
| 2 | Single-line entry | `INSUFFICIENT_LINES` — ✅ verified enforced |
| 3 | Line with both debit and credit | Rejected — ✅ verified enforced |
| 4 | Negative amounts | Rejected — ✅ verified enforced |
| 5 | Save as draft | Persisted, **not** posted, no GL rows, no balance change |
| 6 | Post the draft | GL rows appear, balances update |
| 7 | Edit a posted entry | Must be impossible — ✅ verified (no `update` method exists) |
| 8 | Void a posted entry | Reversing entry; original retained with `void_reason` |
| 9 | Post into a closed period | `PERIOD_LOCKED` |
| 10 | Concurrent posting | No duplicate `JE-XXX` references — ✅ pessimistic lock in place |

**App-side check:** the journal entry form must show a **running debit/credit total and a balance indicator** before submit. QuickBooks disables Save until the entry balances. Confirm FinMatrix does not rely solely on a server rejection.

---

### 3.8 Period close 🟠 **G4 — never exercised**

| # | Test | Expected |
|---|---|---|
| 1 | Set `books_locked_until` = last month end | Persisted on the company |
| 2 | Post dated **before** the lock | `PERIOD_LOCKED` |
| 3 | Post dated **on** the lock date | `PERIOD_LOCKED` (the check is `date <= lock`) |
| 4 | Post dated after | Succeeds |
| 5 | Every document type | Invoice, bill, payment, JE, inventory, payroll, tax — all must be blocked. The check sits in the shared engine, so this should hold; prove it |
| 6 | Draft in a locked period | Allowed to create, blocked on post — matches the documented intent |
| 7 | Year-end rollover | Revenue and expense close to Retained Earnings; balance sheet accounts carry forward |

> **Retained earnings rollover was not found in the audit.** Confirm whether year-end closing entries are generated or whether P&L accounts are computed period-to-date at report time. Both are valid designs, but you must know which one you have before a year end.

---

### 3.9 Reports

All read from `general_ledger` — ✅ correct source of truth.

| Report | Acceptance criterion |
|---|---|
| **Trial balance** | Total debits = total credits. Every account's balance matches I6 |
| **Balance sheet** | Assets = Liabilities + Equity. Must tie to the trial balance |
| **Profit & loss** | Revenue − COGS = gross profit; − expenses = net profit. Net profit must equal the equity movement for the period |
| **Cash flow** | Closing cash must equal the bank/cash account balance on the balance sheet |
| **AR aging** | Total must equal the AR control account and the sum of open invoices |
| **AP aging** | Total must equal the AP control account |
| **Inventory valuation** | Must equal the Inventory control account |

**Cross-report tie-out — the accountant's real test:**
```sql
-- Balance sheet equation straight from the GL
SELECT sum(CASE WHEN a.type='asset' THEN g.debit-g.credit ELSE 0 END)::numeric(18,2) assets,
       sum(CASE WHEN a.type IN ('liability','equity') THEN g.credit-g.debit ELSE 0 END)::numeric(18,2) liab_equity,
       sum(CASE WHEN a.type='revenue' THEN g.credit-g.debit
                WHEN a.type='expense' THEN -(g.debit-g.credit) ELSE 0 END)::numeric(18,2) net_income
FROM general_ledger g JOIN accounts a ON a.id=g.account_id WHERE a.company_id=:c;
-- assets must equal liab_equity + net_income
```

Also test: **date filtering** (a report to 31 Dec must exclude January), **cash vs accrual** (G8), and **empty-company** rendering (a new company must not crash a report).

---

### 3.10 Payroll, tax, bank reconciliation

**Payroll** (1 run in production — lightly exercised):
```
Dr  Wages Expense              gross
Dr  Employer Tax Expense       employer portion
    Cr  Wages Payable / Bank           net pay
    Cr  Employee Tax Withheld          withholdings
```
Gross must equal net + withholdings. Withholdings are a **liability**, not expense — you are holding the employee's money.

**Tax payments** 🔴 (0 rows):
```
Dr  Sales Tax Payable          amount
    Cr  Bank                           amount
```
After filing, the payable should reduce to what genuinely remains owed. Verify the tax report figure agrees with the Sales Tax Payable ledger balance.

**Bank reconciliation** (0 rows): marks transactions `cleared`; correctly does **not** post. Verify: reconciled balance = statement balance; unreconciled items age correctly; a reconciled item cannot be silently edited.

---

### 3.11 Multi-tenancy (security, run every release)

| Test | Expected |
|---|---|
| Request another company's invoice by id | 403/404, never data |
| Post to another company's account | `ACCOUNT_NOT_FOUND` — ✅ verified |
| Report for another company id | Rejected |
| JWT with a stale `companyId` after removal | Rejected |

```sql
-- Cross-company contamination: must return zero rows
SELECT 'LEAK' , l.id FROM journal_entry_lines l
JOIN journal_entries e ON e.id=l.entry_id
JOIN accounts a ON a.id=l.account_id
WHERE a.company_id <> e.company_id;
```
> Run this one after every release. A single row here is a data breach.

---

## 4. Tier test matrix

Feature availability is server-authoritative in `common/features/feature-map.ts`. **The accounting core is never gated** — invoices, bills, payments, ledger and reports work on every tier.

| Feature | small_business | large_org | warehouse |
|---|:--:|:--:|:--:|
| Estimates | ✅ | ✅ | ✅ |
| Journal entries | ✅ | ✅ | ✅ |
| Credit memos / vendor credits | ✅ | ✅ | ✅ |
| Bank reconciliation | ✅ | ✅ | ✅ |
| Multi-user | ❌ | ✅ | ✅ |
| Audit log | ❌ | ✅ | ✅ |
| Period close | ❌ | ✅ | ✅ |
| Payroll | ❌ | ✅ | ✅ |
| Budgets | ❌ | ✅ | ✅ |
| Inventory | ❌ | ❌ | ✅ |
| Purchase orders | ❌ | ❌ | ✅ |
| Sales orders | ❌ | ❌ | ✅ |
| Agencies | ❌ | ❌ | ✅ |
| Delivery | ❌ | ❌ | ✅ |

**Per tier, verify both directions:**
1. Enabled features are reachable and functional.
2. Disabled features are **not reachable by any route** — not in navigation, and the API returns 403 if called directly. The app hard-gates `WAREHOUSE_ONLY_FEATURES` by company type precisely because a stale persisted session could otherwise crash navigation.

> `large_org` has `auditLog: true` and `periodClose: true` — both are advertised but unproven (G2, G4). Do not sign off `large_org` until they work.

---

## 5. Production readiness gate

### 5.1 Must fix before launch

- [ ] **G1 — Add DB CHECK constraints.** Defence in depth for the invariants that matter:
  ```sql
  ALTER TABLE journal_entry_lines ADD CONSTRAINT chk_line_shape
    CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0));
  ALTER TABLE journal_entry_lines ADD CONSTRAINT chk_non_negative
    CHECK (debit >= 0 AND credit >= 0);
  ALTER TABLE invoices ADD CONSTRAINT chk_invoice_math
    CHECK (total - amount_paid = balance);
  ALTER TABLE inventory_items ADD CONSTRAINT chk_no_negative_stock
    CHECK (quantity_on_hand >= 0);
  ```
  Entry-level balance cannot be a CHECK (it spans rows) — enforce with a deferred constraint trigger on `journal_entry_lines`.
- [ ] **G2 — Wire up `audit_trail`.** Every create/update/void of a financial document: who, what, when, before/after. Required for the `auditLog` tier feature.
- [ ] **G3 — Exercise credit memos, vendor credits, inventory adjustments and tax payments** end to end in staging, and confirm postings against §3.5–§3.6 and §3.10.
- [ ] **G4 — Run a full period close** in staging, including all seven §3.8 tests.
- [ ] **G6 — Confirm the inventory costing method.** If FIFO/LIFO are not truly implemented, restrict the enum to `average` rather than shipping a misleading option.

### 5.2 Should fix

- [ ] **G5 — Automated accounting tests.** Minimum viable suite: invoice→payment→ledger, bill→payment→ledger, credit memo reversal, unbalanced-entry rejection, period lock, and the twelve invariants asserted after each.
- [ ] **G7 — Void/reversal tests** for every document type.
- [ ] **G8 — Verify cash vs accrual** reporting honours `companies.accounting_method`.
- [ ] Confirm retained-earnings rollover strategy (§3.8).
- [ ] Confirm payment idempotency actually uses `idempotency_records`.

### 5.3 Sign-off checklist

A release is ready when **all** of these hold:

1. Invariants I1–I12 return zero rows on staging with a full dataset.
2. Every §3 module has been walked end to end on **each applicable tier**.
3. Cross-report tie-out (§3.9) reconciles.
4. The cross-company leak query returns zero rows.
5. `npx tsc --noEmit` clean in both repos; backend `npm test` green.
6. A full period close has been performed and reopened.
7. Every correction path (void, reversal, credit memo, vendor credit) has been exercised.

---

## 6. Suggested regression harness

Turn §2 into a build step so the ledger can never silently break:

```
qa/
  invariants.sql          # §2 — must return zero rows
  seed-scenario.ts        # deterministic company: invoices, bills, payments,
                          # credit memos, inventory, payroll
  run-qa.sh               # seed → exercise → run invariants → fail on any row
```

Wire `run-qa.sh` into CI. Any commit that makes the books not balance then fails the build — which is exactly the guarantee an accounting system needs, and the one thing no amount of manual QA can provide.

---

## Appendix — audit evidence

Queries run against the production database on 13 Aug 2026:

| Check | Result |
|---|---|
| Total debits / credits | 6,464,326.3333 / 6,464,326.3333 — difference `0.0000` |
| Journal entries / lines / GL rows | 119 / 287 / 287 |
| Unbalanced entries | 0 |
| Header-vs-line total mismatches | 0 |
| Accounting equation | Balances for all 3 companies |
| Account balance drift | 0 across 26 active accounts |
| Invoices without a journal entry | 0 of 40 |
| Invoice math / status violations | 0 / 0 |
| Over-applied payments | 0 |
| Negative stock | 0 |
| CHECK constraints in schema | **0** ← G1 |
| `audit_trail` rows | **0** ← G2 |
| `credit_memos` / `vendor_credits` / `inventory_adjustments` / `tax_payments` rows | **0 / 0 / 0 / 0** ← G3 |
| Companies with `books_locked_until` set | **0 of 3** ← G4 |
| Posting sources seen in GL | invoice, payment, bill, bill_payment, delivery_dispatch, po_receipt, opening_balance, delivery_approval, payroll, delivery_return |
| Modules posting via the shared engine | 15 |
| Money column type | `numeric(18,4)` throughout |
