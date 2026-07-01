# FinMatrix — Feature-by-Feature Accounting & QuickBooks Audit
### Reviewed as a QA engineer and an accountant · Frontend + Backend

For **every feature**: (1) its **purpose / how it should work** by accounting principle and as QuickBooks does it, (2) **how FinMatrix implements it**, and (3) a **flag** — 🟢 correct, 🟡 works but should be improved, 🔴 missing or incorrect — with fix guidance where needed.

**Legend:** 🟢 Implemented correctly (accounting-sound and QuickBooks-equivalent) · 🟡 Functional but needs improvement / a gap to close · 🔴 Missing or incorrect — needs implementation.

---

## Scorecard at a glance

| # | Feature | Flag |
|---|---|:--:|
| 1 | Chart of Accounts | 🟢 |
| 2 | Opening Balances | 🟢 |
| 3 | General Ledger & double-entry engine | 🟢 |
| 4 | Customers | 🟢 |
| 5 | Vendors | 🟢 |
| 6 | Inventory Items | 🟢 |
| 7 | Estimates | 🟢 |
| 8 | Sales Orders | 🟢 (create form added) |
| 9 | Invoices | 🟢 |
| 10 | Receive Payments | 🟢 |
| 11 | Credit Memos | 🟢 |
| 12 | Sales Receipt (cash sale) | 🟡 (not a dedicated doc) |
| 13 | Purchase Orders | 🟢 |
| 14 | Bills | 🟢 |
| 15 | Pay Bills | 🟢 |
| 16 | Vendor Credits | 🟢 |
| 17 | Inventory Adjustment | 🟢 |
| 18 | Physical Count | 🟢 |
| 19 | Stock Transfer | 🟢 |
| 20 | General Journal | 🟢 |
| 21 | Sales Tax / Tax Management | 🟢 (recoverable input tax added) |
| 22 | Payroll | 🟢 (simplified) |
| 23 | Budgets | 🟢 |
| 24 | Period Close / Closing Date | 🟢 |
| 25 | Audit Log & Multi-tenancy | 🟢 |
| 26 | Reports (TB, P&L, BS, Cash Flow, AR/AP Aging, Inv Valuation) | 🟢 |
| 27 | **Bank Reconciliation** | 🟢 **(implemented)** |
| 28 | Recurring / Memorized Transactions | 🟡 (missing, nice-to-have) |

**Bottom line:** the accounting core is genuinely QuickBooks-grade. Bank Reconciliation (#27), recoverable input tax (#21), and the Sales Order create form (#8) are now **implemented**. The only remaining items are the two optional convenience docs — Sales Receipt (#12) and Recurring/Memorized transactions (#28).

---

## 1. Chart of Accounts 🟢
**Purpose / how it should work.** The master list of every account, grouped into five types (asset, liability, equity, revenue, expense) and numbered by convention. QuickBooks seeds a default chart, ranges accounts by type, and lets you add/rename/deactivate but not break the type structure.
**How FinMatrix implements it.** Accounts are numbered the QuickBooks/Sage way (1000s assets … 5000s+ expenses); a new company is seeded with system accounts (Cash 1000, AR 1100, Inventory 1200, AP 2000, GRNI 2050, Tax Payable 2300, Opening Balance Equity 3900, Sales 4000, COGS 5000…); the engine resolves these by number so postings always land correctly; new accounts get a proposed valid number in the right range.
**Verdict:** 🟢 Correct and QuickBooks-equivalent.

## 2. Opening Balances 🟢
**Purpose.** Establish the starting position on a conversion date; every opening figure is offset to **Opening Balance Equity** so the books begin balanced. (Exactly QuickBooks' approach.)
**How FinMatrix implements it.** Two paths: a balanced opening journal, or a per-account opening-balance field that **auto-posts the offset to Opening Balance Equity (3900)** in the same transaction. Trial Balance starts balanced either way.
**Verdict:** 🟢 Correct and QuickBooks-equivalent.

## 3. General Ledger & double-entry engine 🟢
**Purpose.** Every transaction posts balanced debits and credits into one permanent, append-only ledger from which all reports are drawn. Voids reverse rather than delete.
**How FinMatrix implements it.** One shared posting service validates each line (exactly one of debit/credit), refuses to post unless debits = credits, applies correct normal-balance signs, writes one GL row per line with a running balance and a link to the source document, enforces the period lock centrally, and supports reversing entries. Reports are computed from these GL rows, not cached values.
**Verdict:** 🟢 This is the heart of the system and it's done right.

## 4. Customers 🟢
**Purpose.** A subledger breaking Accounts Receivable down by customer; carries terms, credit limit, contact and balance. QuickBooks tracks per-customer balances and statements.
**How FinMatrix implements it.** Customer records with terms, credit limit, billing/shipping (geocoded) addresses, running balance, and a statement endpoint; balances move in lockstep with invoices/payments.
**Verdict:** 🟢 Correct.

## 5. Vendors 🟢
**Purpose.** Subledger for Accounts Payable; terms, tax ID, balance.
**How FinMatrix implements it.** Vendor records with terms, tax ID, contact, balance; bills/payments move them.
**Verdict:** 🟢 Correct.

## 6. Inventory Items 🟢
**Purpose.** Stock is an asset at cost; selling relieves cost to COGS. QuickBooks tracks quantity, cost, price, reorder point, and an inventory asset/COGS account per item.
**How FinMatrix implements it.** Items carry cost, price, quantity, reorder point, warehouse/agency; every change writes a movement record; valuation (qty × cost) ties to the Inventory account.
**Verdict:** 🟢 Correct. *(Confirm the costing method — FIFO vs weighted-average — is documented; see note under Invoices.)*

## 7. Estimates 🟢
**Purpose.** A quote — non-binding, **non-posting** until converted. QuickBooks estimates don't affect the ledger.
**How FinMatrix implements it.** Non-posting (verified: no journal entry); can convert to invoice or sales order.
**Verdict:** 🟢 Correct.

## 8. Sales Orders 🟡
**Purpose.** An accepted order — a commitment to deliver, **non-posting** until invoiced. QuickBooks (Enterprise) lets you create a sales order directly *or* from an estimate.
**How FinMatrix implements it.** Backend is correct and complete — non-posting, with `create`, `fulfill`, `convert-to-invoice`, `cancel`. **But the app has no Sales Order *form* screen** — only List and Detail — so the only way to get one is by converting an estimate.
**Verdict:** 🟡 Accounting is correct; **the create UI is missing.**
**How to fix.** Add `SalesOrderFormScreen.tsx` (clone `EstimateFormScreen`, point it at `POST /sales-orders` via the existing `salesOrderSlice`), register it in `TransactionsStack.tsx`, and add a "+ New" button on the list and a Transactions-hub tile. Keep the estimate→SO conversion too. No backend work needed. **Keep it non-posting** — creating an order must not write to the GL.
**✅ Resolved (this pass).** Added `SalesOrderFormScreen.tsx` (create + edit) posting to `POST/PATCH /sales-orders`, registered in `TransactionsStack`, a "+" button on the list, and an "Edit Sales Order" action for open orders. Stays non-posting.

## 9. Invoices 🟢
**Purpose.** A credit sale recognises revenue + receivable + tax liability, and relieves COGS from inventory. QuickBooks posts AR/Revenue/Tax and, for inventory items, COGS/Inventory.
**How FinMatrix implements it.** Two balanced entries in one atomic transaction — (Dr AR; Cr Sales, Cr Tax) and (Dr COGS; Cr Inventory) — reduces quantity on hand; service lines post no cost; void reverses COGS and restocks.
**Verdict:** 🟢 Correct and QuickBooks-equivalent. *(Document the cost method used for COGS so it's explicit.)*

## 10. Receive Payments 🟢
**Purpose.** Collecting a receivable swaps AR for cash — **not** new income. QuickBooks applies the receipt to open invoices.
**How FinMatrix implements it.** Dr Cash/Bank, Cr AR; allocated across open invoices; blocks over-allocation and overpayment.
**Verdict:** 🟢 Correct. *(Hardening note from the Audit report: add a row-level lock so two simultaneous receipts can't overpay — correctness is fine, this is robustness under load.)*

## 11. Credit Memos 🟢
**Purpose.** Mirror of an invoice for returns/corrections; reverses revenue/tax/AR and restocks goods; can be applied or refunded. QuickBooks behaves identically.
**How FinMatrix implements it.** Posts the reversal through the engine, restocks inventory and reverses COGS, supports apply-to-invoice and cash refund.
**Verdict:** 🟢 Correct.

## 12. Sales Receipt / cash sale 🟡
**Purpose.** QuickBooks has a dedicated **Sales Receipt** for a paid-on-the-spot sale (no receivable) — it posts Dr Cash, Cr Revenue/Tax, Cr Inventory/Dr COGS in one step.
**How FinMatrix implements it.** No dedicated sales-receipt document. The workaround is to issue an invoice and immediately receive payment — accounting result is identical, but it's two steps and briefly shows a receivable.
**Verdict:** 🟡 Functionally achievable, not a first-class feature.
**How to fix (optional).** Add a "paid invoice / sales receipt" toggle that, on save, posts the sale and the cash receipt together (Dr Cash instead of Dr AR). Pure convenience; the books are already correct via the workaround.

## 13. Purchase Orders 🟢
**Purpose.** A commitment to buy — **non-posting** until goods are received. QuickBooks POs are non-posting.
**How FinMatrix implements it.** Non-posting; tracks received quantity; posts only on receipt.
**Verdict:** 🟢 Correct.

## 14. Bills 🟢 (with an amber tax sub-point — see #21)
**Purpose.** Records an obligation to pay — an expense or inventory purchase on credit, creating AP. For inventory received via PO, a clearing account avoids double-counting. QuickBooks uses items/accounts on bills and (in jurisdictions with VAT/GST) tracks recoverable input tax separately.
**How FinMatrix implements it.** Inventory bills clear **GRNI (2050)** and credit AP (so inventory isn't counted twice); expense bills debit the expense account and credit AP — all atomic.
**Verdict:** 🟢 for the AP/GRNI/expense mechanics. 🟡 for **input-tax treatment** — see #21.

## 15. Pay Bills 🟢
**Purpose.** Reduces cash and the payable — no new expense. QuickBooks applies payment to selected bills.
**How FinMatrix implements it.** Dr AP, Cr Cash/Bank; allocated across bills.
**Verdict:** 🟢 Correct. *(Same row-lock hardening note as Receive Payments.)*

## 16. Vendor Credits 🟢
**Purpose.** AP-side mirror of a credit memo; reduces what you owe; applied to bills. QuickBooks identical.
**How FinMatrix implements it.** Posts through the engine to reduce AP; apply-to-bill supported.
**Verdict:** 🟢 Correct.

## 17. Inventory Adjustment 🟢
**Purpose.** Write stock up/down for damage, theft, or error; the loss is an expense. QuickBooks posts the difference to an inventory-adjustment account.
**How FinMatrix implements it.** Dr Inventory Adjustment (6400), Cr Inventory (or reverse for an increase); records the movement.
**Verdict:** 🟢 Correct.

## 18. Physical Count 🟢
**Purpose.** Enter a real shelf count; the system posts the variance as an adjustment. QuickBooks has an Inventory Qty Adjustment / count.
**How FinMatrix implements it.** Posts the difference through the adjustment path so book quantity matches reality.
**Verdict:** 🟢 Correct.

## 19. Stock Transfer 🟢
**Purpose.** Move stock between locations — **asset-to-asset, no P&L impact.**
**How FinMatrix implements it.** Quantity moves between warehouses; because it stays in the same Inventory GL account it correctly posts no profit-and-loss effect (verified in code comment and logic).
**Verdict:** 🟢 Correct.

## 20. General Journal 🟢
**Purpose.** Direct balanced entries for depreciation, accruals, owner capital, corrections, opening balances. QuickBooks' Make General Journal Entries.
**How FinMatrix implements it.** A direct window to the engine; live balanced indicator; won't post unless debits = credits; drafts and voids supported.
**Verdict:** 🟢 Correct.

## 21. Sales Tax / Tax Management 🟡
**Purpose.** Output tax charged on sales is a **liability** (you collect it for the authority). Input tax paid on purchases, **for a registered business, is recoverable** — it should sit in a separate input-tax asset (or net against the payable), so the amount you remit = output tax − input tax. QuickBooks tracks output and input tax separately and computes the net.
**How FinMatrix implements it.** Output tax on invoices is correctly credited to **Tax Payable (2300)** — 🟢. **But input tax on bills is added into the expense/inventory line amount** (the bill debits `amount + taxAmount` to the expense/COGS account), i.e. it is **not** separated as recoverable.
**Verdict:** 🟡 Correct **only** for a business that is *not* GST/VAT-registered (can't reclaim). For a **registered** business it overstates expenses and understates the tax asset, and the net-tax-owed figure is wrong.
**How to fix.** When a bill line carries tax and the company is tax-registered, post the input tax to a dedicated **Input Tax / Sales Tax Recoverable** asset account (e.g. 1300) rather than into the expense; the **Tax Liability** report should then show *net* tax = output (2300) − input (1300). Add a company setting "GST/Sales-tax registered (reclaim input tax) yes/no" to switch the behaviour. Add a test asserting net tax = output − input.
**✅ Resolved (this pass).** Added **Sales Tax Recoverable (1300)** asset account (seeded + lazily created), a `salesTaxRegistered` company flag (migration + `PATCH /companies/:id` + a toggle on the Tax Settings screen), and made `bills.service.createJournalEntryForBill` split input tax to 1300 (DR net expense, DR input tax, CR AP) when registered — otherwise it stays rolled into the line (legacy). The **Tax Liability** report is now ledger-derived and shows net = output (2300) − input (1300) − remitted.

## 22. Payroll 🟢 (simplified)
**Purpose.** Gross pay splits into salary **expense**, withheld taxes (**liabilities**), and **net** cash. QuickBooks Payroll adds tax tables, filings, and pay stubs.
**How FinMatrix implements it.** Computes gross, deductions (default withholding), net; posts a balanced entry through the engine.
**Verdict:** 🟢 Accounting is correct. 🟡 *as a payroll product* it's simplified — fine for general ledger purposes; if you market full payroll, you'd later add statutory tax tables and payslips. Not an accounting defect.

## 23. Budgets 🟢
**Purpose.** Non-posting plans compared to actuals. QuickBooks' Budget vs Actual.
**How FinMatrix implements it.** Stored budget figures with a vs-actual view pulled from the ledger.
**Verdict:** 🟢 Correct.

## 24. Period Close / Closing Date 🟢
**Purpose.** Lock a reported period so no one posts into it. QuickBooks' Closing Date.
**How FinMatrix implements it.** A company `booksLockedUntil` date is enforced centrally in the posting engine for every document type.
**Verdict:** 🟢 Correct — and many small apps lack this, so it's a real strength.

## 25. Audit Log & Multi-tenancy 🟢
**Purpose.** Record who did what and when; isolate each company's books; enforce roles. QuickBooks has an Audit Trail and user roles.
**How FinMatrix implements it.** An audit surface, JWT-derived company isolation (`company.guard`), and role-based access (Admin, Staff, Delivery, Super-Admin).
**Verdict:** 🟢 Correct *(confirm roles are enforced server-side on every financial endpoint, per the Audit report).*

## 26. Reports 🟢
**Purpose.** Trial Balance (proves Dr = Cr), P&L (profitability), Balance Sheet (position), Cash Flow, AR Aging, AP Aging, Inventory Valuation, General Ledger — all **derived from the ledger**. These are what the owner actually reviews.
**How FinMatrix implements it.** All present as endpoints (`/reports/trial-balance`, `/profit-loss`, `/balance-sheet`, `/cash-flow`, `/ar-aging`, `/ap-aging`, `/inventory-valuation`) and computed by summing the **general_ledger** rows, so they always tie out (Balance Sheet inventory = Inventory Valuation; AR = open invoices = AR Aging; Assets = Liabilities + Equity).
**Verdict:** 🟢 Correct and comprehensive — this matches QuickBooks' core financial report set.

## 27. Bank Reconciliation 🔴 (the one significant gap)
**Purpose.** Monthly, the owner matches the book's cash/bank ledger against the **actual bank statement**, ticking off cleared transactions and resolving differences, then "reconciles" the period. This is a **core QuickBooks feature** and the main control that catches errors, missing entries, and fraud. Without it, the bank balance in the books is never independently verified.
**How FinMatrix implements it.** **Not implemented** — there is no reconciliation module (verified). Cash/bank balances are tracked from postings but never matched to a statement.
**Verdict:** 🔴 Missing — this is the biggest accounting-completeness gap versus QuickBooks.
**How to fix.** Add a Bank Reconciliation feature: (a) a screen to select a bank account and enter the statement's ending balance and date; (b) list the unreconciled GL entries for that account; (c) let the user tick entries that appear on the statement; (d) show a live "difference" = (statement balance) − (book cleared balance) that must reach **0** to finish; (e) on finish, stamp those entries `reconciled` with a reconciliation record. Backend: a `reconciliations` table + a `cleared/reconciled` flag on GL/bank rows; endpoints to start, match, and finalise. This does **not** post journal entries — it's a verification/marking process (any *corrections* found are entered as normal transactions or journal entries). Add bank statement import (CSV/OFX) later as an enhancement.
**✅ Resolved (this pass).** Added a `reconciliations` table + `cleared`/`reconciliation_id` markers on `general_ledger` (migration), a `reconciliations` module (`GET /accounts`, `GET /unreconciled`, `GET /`, `GET /:id`, `POST /`, `DELETE /:id`), and three screens (Bank Reconciliation hub with accounts + history, the reconcile workflow with live difference, and a completed-reconciliation detail with undo) under **More → Accounting → Bank Reconciliation**. Finalise validates difference = 0 (beginning balance carried from prior reconciliations) and stamps rows reconciled. Posts **no** journal entries.

## 28. Recurring / Memorized Transactions 🟡 (nice-to-have)
**Purpose.** QuickBooks lets you memorise a recurring invoice/bill (e.g. monthly rent) to auto-create on schedule.
**How FinMatrix implements it.** Not present.
**Verdict:** 🟡 Convenience feature, not an accounting requirement. Add later if your users ask: a template + schedule that generates the document (which then posts normally).

---

## What to do, in priority order

1. 🔴 **Bank Reconciliation (#27)** — the one feature whose absence a QuickBooks user will immediately notice. Build it.
2. 🟡 **Input-tax treatment (#21)** — important for GST-registered businesses; add the recoverable-input-tax posting + a registration setting.
3. 🟡 **Sales Order create form (#8)** — small frontend fix; surfaces an already-built backend capability.
4. 🟡 **Sales Receipt (#12)** and **Recurring (#28)** — convenience; do if users want them.
5. Then the hardening items from the separate **Audit & Fixes report** (payment row locks, journal-reference uniqueness, atomic balance update, CI for the acceptance suite).

After items 1–2, FinMatrix is **feature-complete against QuickBooks' core accounting** and accounting-correct across the board. Everything else above is already 🟢.

---

### Honest summary for your stakeholders
*FinMatrix correctly implements the full double-entry accounting cycle the way QuickBooks does — chart of accounts, opening balances, the complete sales and purchase cycles, inventory with COGS, tax, payroll, period close, and ledger-derived financial reports — with a clean, auditable, atomic posting engine. The gaps are narrow and known: it lacks bank reconciliation (the main missing QuickBooks feature), its input-tax handling needs a recoverable-tax option for GST-registered businesses, and a few convenience documents (direct sales-order entry, sales receipts, recurring transactions) are not yet exposed. None of these undermine the integrity of the books; they are additive features on an already-sound accounting foundation.*