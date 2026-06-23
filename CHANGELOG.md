# FinMatrix — Production-Hardening CHANGELOG

Tracks work against `FinMatrixGuide.md`. Newest first.

## Phase 0 — Discovery (2026-06-23)
- Produced `AUDIT_REPORT.md` (§2): backend = NestJS + TypeORM + Postgres; ledger
  tables = accounts / journal_entries / journal_entry_lines / general_ledger_entries;
  `posting.service.ts` is a correct, atomic, Decimal-based posting engine.
- Posting-coverage findings (verified): invoice posts revenue but **not** the
  COGS/Inventory cost entry; PO-receipt, inventory adjustments/counts/transfers,
  and tax-payment post **no** journal entry; opening balances post **no** offset;
  reports compute from documents, not from the ledger.

## MetroMatrix reseed — 1 year through the ledger (2026-06-24, live-verified)
The legacy seed inserted documents directly (no journal entries), so ledger-derived
reports showed nothing. New `seed:metromatrix:ledger` boots the Nest app context and
posts ~12 months of activity THROUGH the services (PO→receive→bill→pay, invoices with
inventory item lines → COGS, customer payments, monthly expense bills). Keeps the
company, admin login, riders and chart of accounts; resets only transactional + master
data. *Verified on prod:* 36 invoices / 12 POs / 24 bills / 56 payments, 0 errors;
**Trial Balance balanced, Balance Sheet balanced (Assets 233,320 = Liab 158,080 +
Equity 75,240), P&L Revenue 929,880 − COGS 710,640 − Expenses 144,000 = Net +75,240.**

## Phase 4 — Guided setup checklist (2026-06-24, deployed Heroku v19, live-verified)
§5.7 (the one authorized new feature — surfaces existing flows, no new accounting).
- Backend: `companies.setup_completed` column (migration 1782700000000) +
  `UpdateCompanyDto.setupCompleted`; `GET /reports/dashboard` now returns a `setup`
  object (per-step done signals + completed flag).
- Frontend: `SetupChecklist` card on the admin dashboard (shows while incomplete) with
  ordered steps — Add Opening Balances → COA → Inventory (optional) → Customers →
  Vendors → Tax rates — each routing to the existing screen; progress + Dismiss
  (PATCH setupCompleted). The opening-balance CTA opens the General Journal flow, which
  stays reachable under Transactions → Accounting after dismissal.

## Phase 3 — Reports from the ledger (2026-06-23, deployed Heroku v20, live-verified)
§5.2/§5.3. Trial Balance, Balance Sheet and P&L now derive from posted journal
entries (the `general_ledger` table joined to the chart of accounts) via a shared
`glByAccount()` helper — not from document tables / a 70-30 purchases guess.
- P&L: revenue & expense account movements (COGS = subType 'Cost of Goods' / 5xxx).
- Balance Sheet: asset/liability/equity balances as of date; current-period net
  income rolls into equity; `isBalanced` computed.
- Trial Balance: per-account net debit/credit; balances to the paisa.
- *Verified on prod:* Trial Balance Dr 177,242 = Cr 177,242 (balanced, 11 accounts);
  Balance Sheet Assets 14,658 = Liabilities 458 + Equity 14,200 (balanced).
- NOTE: pre-existing seed documents were inserted without journal entries, so on the
  demo company these reports show only ledger-posted activity. Also: physical count +
  stock transfer postings landed in v18; remaining = A/R-A/P aging & inventory
  valuation & cash-flow still document-derived (consistent sub-ledgers).

## Phase 2c — PO receipt → GRNI → bill (2026-06-23, deployed Heroku v17, live-verified)
Resolves known issue #3 (inventory-vs-bill double count), §3.3/§3.4.
- `purchase-orders.service.receive()`: item-linked lines raise `quantityOnHand` by the
  newly-received delta, write a 'receipt' movement, and post DR Inventory 1200 / CR
  GRNI 2050 at delta×unitCost. `createBill()`: inventory lines debit GRNI (clearing the
  accrual), expense lines debit their account. `defaultAccountId` made optional.
- *Verified:* PO 10 units @230 → receive: Inventory +2300, GRNI +2300, qty +10; create
  bill: GRNI→0, AP +2300, **Inventory unchanged (rose exactly once)**.

## Phase 2b — Invoice COGS (2026-06-23, deployed Heroku v16, live-verified)
§3.1/§3.13. Invoice lines optionally link an inventory item (`itemId`, migration
1782600000000). Issuing posts DR COGS 5000 / CR Inventory 1200 at qty×unitCost +
reduces stock; voiding reverses + restocks. Frontend invoice form has an optional
"Inventory Item" picker per line (auto-fills description + selling price).
*Verified:* qty 2 @ cost 230 → COGS +460 / Inventory −460 / qty 335→333; void → all
reverse, qty→335.

## Phase 2a — Inventory & tax postings (2026-06-23, deployed Heroku v15, live-verified)
- **Inventory adjustment (§3.8):** `inventory.service.adjust()` now posts a balanced
  JE valuing the quantity variance at the item's unit cost — decrease = DR Inventory
  Adjustment 6400 / CR Inventory 1200; increase = the reverse — inside the existing
  transaction, and sets `adjustment.journalEntryId`. Added expense account
  **Inventory Adjustment/Shrinkage (6400)** to the COA + lazy create. *Verified:*
  −5 units @ cost 230 → Inventory 1200 −1150, account 6400 +1150 (balanced).
- **Tax payment (§3.9):** `tax.service.createPayment()` now posts DR Sales Tax
  Payable 2300 / CR Cash 1000 atomically and sets `journalEntryId`. *Verified:*
  payment 1000 → Tax Payable 16408→15408, Cash −144434→−145434.

### Phase 2 still outstanding
- Invoice COGS/Inventory cost entry + `quantityOnHand` reduction + void restock —
  **requires adding optional `itemId` to invoice lines** (entity + DTO + migration +
  a frontend item picker); FinMatrix invoice lines are currently free-text only.
- PO-receipt → GRNI (§3.3); bill GRNI clearing vs direct-expense (§3.4); physical
  count applying variances; stock-transfer two-sided qty; credit-memo return-to-inventory.

## Phase 1 — Ledger integrity (2026-06-23, deployed Heroku v14, live-verified)
**Known issue §4.2 / §3.12 — opening-balance offset (backend):**
- `accounts.constants.ts`: added system accounts **Opening Balance Equity (3900)**
  and **Inventory Received Not Billed / GRNI (2050)** to `DEFAULT_CHART_OF_ACCOUNTS`
  (so new companies get them); added `ACCT_OPENING_BALANCE_EQUITY`, `ACCT_GRNI`,
  `ACCT_INVENTORY` constants and a `SYSTEM_ACCOUNT_DEFS` map; added
  `'Opening Balance Equity'` to the equity sub-types.
- `accounts.service.ts`: `create()` is now **transactional** and, for a non-zero
  opening balance, posts a balanced opening journal entry offset to Opening Balance
  Equity (3900) via `PostingService` in the same transaction (debit/credit side
  chosen by the account's normal balance). Added `getOrCreateSystemAccount()` so
  companies whose chart predates 3900/2050 get the account created lazily. OBE
  itself is exempt from self-offsetting.
- `accounts.controller.ts`: `create` now passes the authenticated user id (needed
  as `createdBy` on the opening JE).
- `accounts.module.ts`: imports `JournalEntriesModule` to inject `PostingService`
  (one-way edge, no DI cycle).
- Result: setting an opening balance on an account now keeps the Trial Balance
  balanced (the spec's #1 cause of imbalance). Backend `nest build` green.

**Known issue §4.1 — hard-coded company IDs (frontend):**
- Removed the hard-coded `comp-001` / `comp_001` literals from all 6 sites and
  sourced the real tenant from `getStoredCompanyId()` (the same value used for the
  `x-company-id` header): `COAFormScreen`, `payBillsSlice`, `receivePaymentSlice`,
  `vendorFormSlice`, `poFormSlice`, `CustomerFormScreen`. Backend already derives
  tenant from the token and ignores any client `companyId`. Frontend `tsc` green.

### Still outstanding (next phases, per AUDIT_REPORT §7)
- **Phase 2:** invoice COGS/Inventory cost entry + `quantityOnHand` reduction +
  void restock; PO-receipt→GRNI→bill flow (no double-count); inventory
  adjustment/count/transfer postings; tax-payment posting; credit-memo
  return-to-inventory.
- **Phase 3:** reports computed from the GL; cross-report invariants.
- **Phase 4:** endpoint/serializer parity, conversions, guided setup checklist (§5.7).
- **Phase 5:** idempotency, period lock, optimistic locking, tenant/role tests, audit.
- **Phase 6:** acceptance suite (§8).

> Note: backend changes are **not yet deployed** (`git push heroku main`) and
> existing companies (e.g. MetroMatrix) will get OBE/GRNI lazily on first use; new
> companies get them seeded. No migration is required for Phase 1.
