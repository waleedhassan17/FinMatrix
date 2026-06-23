# FinMatrix — AUDIT_REPORT.md (Phase 0 Discovery)

Per `FinMatrixGuide.md` §2. Findings verified against the live code on
2026-06-23. Frontend = `/home/muhammad-waleed-hassan/FinMatrix`,
Backend = `/home/muhammad-waleed-hassan/FinMatrix-Backend/FinMatrix-Backend`.

## 1. Backend stack & ledger model
- **Stack:** NestJS + TypeORM + PostgreSQL. Migrations-based (synchronize off).
- **Ledger tables (the source of truth):**
  - `accounts` — chart of accounts (`opening_balance`, `balance`, `type`, `sub_type`…).
  - `journal_entries` — header (`reference`, `status` draft|posted|void, `total_debits`, `total_credits`, `reversal_of_id`, `void_reason`, `posted_by/at`).
  - `journal_entry_lines` — `account_id`, `debit`, `credit`, `line_order`.
  - `general_ledger_entries` — per-line GL rows with running `balance`.
- **Posting engine:** `journal-entries/posting.service.ts` — `Decimal.js`, validates each line is exactly one-sided, asserts debits=credits before `posted`, persists JE + lines, updates account balances, writes GL rows. **Atomic** (runs inside the caller's `EntityManager` transaction). This engine is correct and is the shared primitive for all auto-posting.

## 2. Posting audit (per document type)
| Document | Posts JE? | Status |
|---|---|---|
| Invoice issued (§3.1) | revenue only | ⚠️ posts AR/Revenue/Tax but **MISSING the COGS/Inventory cost entry and the `quantityOnHand` reduction**; void reverses revenue only, no restock |
| Payment received (§3.2) | yes | ✅ Cash/AR (allocates to invoices) |
| Bill (§3.4) | yes | ⚠️ posts Expense/AP but **no GRNI clearing for PO-received bills** → inventory double-count risk |
| PO receipt (§3.3) | **no** (`createEntry` count = 0) | ❌ does not post Inventory/GRNI |
| Credit memo (§3.6) | yes (3 calls) | ⚠️ posts AR side; confirm return-to-inventory (Inventory/COGS) |
| Vendor credit (§3.7) | yes (2 calls) | ✅ |
| Inventory adjustment / count / transfer (§3.8) | **no** | ❌ stock moves with no GL posting (shrinkage expense never recorded) |
| Tax payment (§3.9) | **no** in `tax.service` | ❌/verify — no `createEntry`; Tax Payable not relieved by a posted entry |
| Payroll run (§3.10) | yes | ✅ |
| Manual journal (§3.11) | yes | ✅ enforces debits=credits; void = reversing entry |
| **Opening balances (§3.12)** | **no offset** | ❌ `accounts.create()` stores `opening_balance` and sets `balance` but posts **no offsetting entry to Opening Balance Equity** → **#1 cause of unbalanced Trial Balance** |

## 3. Endpoint coverage (Appendix A)
- Report endpoints present: `profit-loss, balance-sheet, ar-aging, ap-aging, inventory-valuation, trial-balance, cash-flow, dashboard` (+ `general-ledger` under the `/ledger` module). **Caveat:** `reports.service` computes from **document tables (invoices/bills/inventory)**, not from posted journal entries / GL. §5.2 requires reports to be **ledger-derived**. → Phase 3.
- Remaining Appendix A surfaces (accounts, customers, vendors, inventory, invoices, payments, bills, POs, estimates, sales-orders, credit-memos, vendor-credits, journal, taxes, budgets, payroll, deliveries, delivery-personnel, inventory-approvals, agencies) are implemented (prior phases). Per-endpoint shape parity to re-confirm in Phase 4.

## 4. The three known issues (§4) — CONFIRMED & LOCATED
1. **Hard-coded company IDs (frontend).** Not just one file — **5**:
   - `src/screens/ChartOfAccounts/COAForm/COAFormScreen.tsx:180` (`'comp-001'`)
   - `src/screens/Bills/PayBills/payBillsSlice.ts:204` (`'comp_001'`)
   - `src/screens/Vendors/VendorForm/vendorFormSlice.ts:64`
   - `src/screens/PurchaseOrders/POForm/poFormSlice.ts:94`
   - `src/screens/Payments/ReceivePayment/receivePaymentSlice.ts:249`
   Backend already derives tenant from the JWT/`x-company-id` via `@CurrentCompany()` and DTO whitelist strips client `companyId`, so these are dead/ignored — but must be removed per the spec.
2. **Opening-balance offset missing** — see table above (`accounts.service.ts create()`). Backend fix required.
3. **Inventory-vs-Bill double-count** — no GRNI clearing account exists; PO receipt posts nothing; bill posts expense/AP directly. Needs the §3.3/§3.4 GRNI flow.

## 5. Missing system accounts
Default COA (`accounts.constants.ts`) lacks two accounts the contract needs:
- **Opening Balance Equity (3900)** — offset for §3.12.
- **GRNI / Inventory-Received-Not-Billed clearing (2050)** — for §3.3/§3.4.
Real account codes in use (use these, not the spec's illustrative numbers): Cash 1000, Bank 1010, **AR 1100**, **Inventory 1200**, AP 2000, **Sales Tax Payable 2300**, Owner Equity 3000, Retained Earnings 3100, Sales Revenue 4000, COGS 5000.

## 6. Connectivity / hardening gaps (for later phases)
- Reports not ledger-derived (§5.2) — Phase 3.
- No idempotency keys, no period locking, no optimistic locking (§6) — Phase 5.
- Tenant isolation enforced via `@CurrentCompany()`; needs explicit tests (§6.5).
- Guided dashboard setup checklist / "Add Opening Balance" entry point (§5.7) not built — Phase 4.

## 7. Proposed plan (guide §7)
- **Phase 1 (this pass):** opening-balance offset + add OBE 3900 & GRNI 2050 to the COA + remove hard-coded frontend company IDs. *(executed below)*
- **Phase 2:** invoice COGS/Inventory + qty reduction + void restock; PO-receipt→GRNI→bill flow; inventory adjustment/count/transfer postings; tax-payment posting; credit-memo return-to-inventory.
- **Phase 3:** reports server-computed from the GL; cross-report invariants.
- **Phase 4:** endpoint/serializer parity, conversions, setup checklist (§5.7).
- **Phase 5:** atomicity/idempotency/period-lock/tenant tests/concurrency/audit/observability.
- **Phase 6:** acceptance suite (§8) green on a seeded company.
