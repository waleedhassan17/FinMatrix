# FinMatrix — ACCOUNTING_CONTRACT.md (as-built)

The double-entry postings the backend actually performs, with the **real account
codes** in this system. Every document posts a balanced journal entry atomically
in one DB transaction (FinMatrixGuide §3). Engine: `journal-entries/posting.service.ts`
(Decimal.js; asserts debits = credits before `posted`; writes `journal_entries`,
`journal_entry_lines`, `general_ledger`, and updates `accounts.balance`).

## System accounts (`accounts.constants.ts`)
| Code | Name | Type |
|---|---|---|
| 1000 | Cash | asset |
| 1010 | Business Checking | asset (bank) |
| 1100 | Accounts Receivable | asset |
| 1200 | Inventory | asset |
| 2000 | Accounts Payable | liability |
| 2050 | Inventory Received Not Billed (GRNI) | liability |
| 2300 | Sales Tax Payable | liability |
| 3000 | Owner Equity | equity |
| 3100 | Retained Earnings | equity |
| 3900 | Opening Balance Equity | equity |
| 4000 | Sales Revenue | revenue |
| 5000 | Cost of Goods Sold | expense |
| 6000/6100/6200/6300 | Rent / Utilities / Salary / Office | expense |
| 6400 | Inventory Adjustment / Shrinkage | expense |

3900, 2050 and 6400 are auto-created on demand for companies whose chart predates
them (`AccountsService.getOrCreateSystemAccount`).

## Postings

### Invoice issued (`POST /invoices`, `/invoices/:id/send`) — §3.1
Revenue entry: **DR 1100 AR** (total) / **CR 4000 Revenue** (subtotal−discount) / **CR 2300 Tax** (tax, only if > 0).
Cost entry, per line linked to an inventory item: **DR 5000 COGS** / **CR 1200 Inventory** at qty×unitCost; reduces `quantityOnHand`, writes a `sale` movement. Free-text lines post no cost.

### Payment received (`POST /payments`) — §3.2
**DR 1000/1010 Cash** / **CR 1100 AR**. Allocates to invoices (explicit `applications` or FIFO); updates `amountPaid`/`status`.

### PO receipt (`POST /purchase-orders/:id/receive`) — §3.3
Per item line, raises `quantityOnHand` by the newly-received delta and posts **DR 1200 Inventory** / **CR 2050 GRNI** at delta×unitCost; writes a `receipt` movement.

### Bill (`POST /bills`, `POST /purchase-orders/:id/create-bill`) — §3.4
PO-sourced inventory lines: **DR 2050 GRNI** (clears accrual) / **CR 2000 AP**. Direct expense lines: **DR 6xxx Expense** / **CR 2000 AP**. (+ input tax line if present.) Inventory rises exactly once per purchased unit; GRNI nets to zero.

### Pay bills (`POST /bills/pay`) — §3.5
**DR 2000 AP** / **CR Cash**.

### Credit memo (`POST /credit-memos`) — §3.6
**DR 4000 Revenue** (+ **DR 2300 Tax**) / **CR 1100 AR**. `/apply` nets an open invoice; `/refund` credits Cash; `/void` reverses. *(Return-to-inventory restock requires `itemId` on credit-memo lines — tracked as a follow-up; AR/revenue side is correct.)*

### Vendor credit (`POST /vendor-credits`) — §3.7
**DR 2000 AP** / **CR** original expense/inventory account; `/apply` nets an open bill.

### Inventory adjustment & physical count (`/inventory/items/:id/adjust`, `/inventory/physical-counts`) — §3.8
Decrease: **DR 6400 Adjustment** / **CR 1200 Inventory**; increase: reverse. Value = |variance|×unitCost. Physical count reconciles `quantityOnHand` to the counted value and posts the variance the same way. Stock transfer: relocates the item (asset-to-asset), no qty change, no P&L.

### Tax payment (`POST /taxes/payments`) — §3.9
**DR 2300 Sales Tax Payable** / **CR 1000 Cash**.

### Payroll run (`POST /payroll/runs/:id/process`) — §3.10
**DR 6200 Salary Expense** (gross) / **CR 2300** (deductions) / **CR Cash** (net).

### Manual journal (`POST /journal-entries`, `/:id/post`) — §3.11
User-defined balanced lines. `draft` posts nothing; `posted` hits the ledger; `/void` posts a reversing entry.

### Opening balances — §3.12
Per-account opening balance auto-posts the offset to **3900 Opening Balance Equity** in the same transaction (`AccountsService.create`). Manual opening journal also supported via the General Journal.

### Voids & reversals — §3.13
Voiding a posted document posts a dated reversing entry (`reversalOfId`) and restores inventory where applicable; the original is never deleted (`status='void'`).

## Period lock
`PostingService.assertPeriodOpen` rejects any **posted** entry dated on/before
`companies.books_locked_until` (`PERIOD_LOCKED`). Drafts are allowed; post once reopened.
