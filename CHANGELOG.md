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

## Phase 1 — Ledger integrity (2026-06-23)
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
