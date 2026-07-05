# ACCOUNTING AUDIT — Chunk 2 Phase 0
> **STATUS 2026-07-05: ALL GAPS CLOSED.** The three defects below (§1 delivery-approval commit, §3 weighted-average cost, §4 reconciliation undo lock) are implemented and proven by `test/chunk2.acceptance.ts` (78/78). See `ACCOUNTING_SIGNOFF.md` for the per-document sign-off.
**Date:** 2026-07-05 · **Repos:** FinMatrix-Backend @ `a8c79e4`-era main, FinMatrix @ `a8c79e4` · **Baseline evidence:** `test/acceptance.ts` 32/32 green (2026-07-05, local QA + prod)

Engine facts verified in code: single `PostingService` (`journal-entries/posting.service.ts`) — rejects unbalanced entries (decimal equality), atomic `dataSource.transaction` everywhere, `assertPeriodOpen` (booksLockedUntil) enforced centrally, journal-reference generation serialized by a pessimistic lock on the company row, atomic SQL balance updates, `@VersionColumn` optimistic locking on Invoice/Bill, `IdempotencyInterceptor` (Idempotency-Key header) registered globally. Money = decimal.js + `decimal(18,4)` columns; 4 dp storage / 2 dp display.

## 1. Document-type posting matrix

| Document | Verdict | Entry produced today | vs. required |
|---|---|---|---|
| **Invoice (credit sale)** | ✅ | Dr AR (gross); Cr Sales Revenue (net); Cr Tax Payable 2300 (tax) **+ per stock line** Dr COGS 5000 / Cr Inventory 1200 at `item.unitCost`, qty↓, 'sale' movement. Service lines (no itemId) post no cost. | Matches. |
| **Invoice void** | ✅ | Reverses revenue entry AND cost entry, restocks qty, 'return' movement; tax line conditional. | Matches. |
| **Receive payment** | ✅ | Dr Bank/Cash (defaults 1000 cash / 1010 other) / Cr AR; applications row-locked (`pessimistic_write`); over-application (Σ > amount) rejected; remainder → customer credit. No P&L. | Matches. |
| **Bill (PO-based)** | ✅ | Inventory lines routed to **Dr GRNI 2050** / Cr AP (clears receipt parking; inventory NOT touched again). | Matches. |
| **Bill (expense)** | ✅ | Dr expense account / Cr AP. | Matches. |
| **Input tax** | ✅ | Gated on `companies.sales_tax_registered`: registered → Dr Sales Tax Recoverable **1300**; else rolled into expense/inventory cost. | Matches (QB-audit #21). |
| **Pay bills** | ✅ | Dr AP / Cr Bank/Cash; per-bill row locks; no P&L. Concurrency: acceptance #19 (one of two concurrent payments wins, no overpay). | Matches. |
| **PO receipt** | ✅ | Dr Inventory 1200 / Cr GRNI 2050 at received-delta × PO line cost; qty↑ once; 'receipt' movement. GRNI nets to 0 after bill. | Matches. |
| **Credit memo** | ✅ | Dr Revenue + Dr Tax Payable / Cr AR; **item lines restock** (qty↑, Dr Inventory / Cr COGS at item cost); apply-to-invoice and cash refund (Dr AR / Cr Cash) both post; void reverses incl. pulling restocked goods back out. | Matches (itemId on credit_memo_lines, migration 1783300000000). |
| **Vendor credit** | ✅ | Dr AP / Cr expense (line account or COGS); apply-to-bill via `billsService.applyCredit`; void reverses. | Matches. |
| **General journal** | ✅ | Manual controller: arbitrary lines; refuses unbalanced; draft posts nothing until `/post`; void = reversing entry (Dr/Cr swap, `reversalOfId`). | Matches. |
| **Opening balances** | ✅ | Account create with opening balance posts balanced JE against **Opening Balance Equity 3900** in the same transaction. | Matches. |
| **Inventory adjustment** | ✅ | Decrease: Dr Inventory Adjustment/Shrinkage 6400 / Cr Inventory 1200 at variance × unitCost (increase reverses); `journalEntryId` linked. | Matches. |
| **Physical count** | ✅ | Applies variance via the shared adjustment helper (`postInventoryAdjustmentJe`) so book qty = counted qty, with the same 6400/1200 JE. | Matches. |
| **Stock transfer** | ✅ | Net-zero asset-to-asset: locationId moves, movements recorded, **no P&L**, qty preserved. | Matches. |
| **Tax payment** | ✅ | Dr Sales Tax Payable 2300 / Cr Cash 1000; `journalEntryId` linked. | Matches. |
| **Payroll (process run)** | ✅ | Dr Salary Expense 6200 (gross) / Cr Cash (net) / Cr Tax Payable 2300 (deductions); pay stubs generated. | Matches. |
| **Delivery approval (Chunk-1 marker)** | ❌ **THE GAP** | Approval adjusts `quantityOnHand` (row-locked, negative-stock-guarded) + writes an inventory movement, **but posts NO journal entry** — the `// CHUNK2: commit stock on approval` marker sits where the ledger commit belongs. Consequence: after any approved delivery, **Inventory Valuation (qty×cost) diverges from GL Inventory 1200 / Balance Sheet** — breaks the Phase C invariant. | Must post **Dr COGS 5000 / Cr Inventory 1200** at qty × item unit cost, atomically inside the existing approval transaction (deliveries are not linked to invoices, so no COGS double-count arises; documented below). |

## 2. Reports — derivation status

| Report | Source today | Verdict |
|---|---|---|
| Trial Balance | `general_ledger` aggregate (glByAccount) | ✅ ledger-derived; Dr=Cr verified live |
| Profit & Loss | `general_ledger` | ✅ |
| Balance Sheet | `general_ledger` as-of + net income folded into equity, isBalanced computed | ✅ |
| Cash Flow | `general_ledger` movements on Cash/Bank sub_type by payment date (direct method; ties to BS cash) | ✅ (rewritten 2026-06-30) |
| General Ledger report | `general_ledger` | ✅ |
| A/R Aging | Open-invoice documents, bucketed by due date | ✅ **as a sub-ledger** (QB ages open documents too). Invariant to TEST: aging total = Σ open invoice balances = GL 1100 balance. |
| A/P Aging | Open-bill documents | ✅ same; invariant to TEST vs GL 2000. |
| Inventory Valuation | `inventory_items` qty × unitCost | ✅ as a sub-ledger. Invariant to TEST: total = GL 1200 — currently **broken by the delivery-approval gap** (§1) and at risk from the cost-method gap (§3). |
| Dashboard summary | Mixed (document KPIs) | ⚠️ KPI-only, not a financial report — out of scope. |

## 3. Cost method — gap
COGS posts at `item.unitCost` (standard cost), but **PO receipts post Inventory at the PO line cost without updating `item.unitCost`**. Buy 10 @ 90 when unitCost = 100 → GL Inventory +900, valuation +1,000: permanent drift. **Fix (Phase B): weighted-average cost** — on every receipt, `unitCost = (onHandQty×unitCost + recvQty×poCost) / (onHandQty + recvQty)` inside the receipt transaction; all outflows (invoice COGS, credit-memo restock reversal, adjustments, delivery approval) consistently use the current average. Documented as THE cost method.

## 4. Bank reconciliation — exists (contra the prompt's assumption), close to spec
`reconciliations` module + `cleared`/`reconciliation_id` flags on `general_ledger` rows (migration 1783200000000) + 3 FE screens (List/Run/Detail) already shipped (QB-audit #27). Verified: start (account + statement balance/date), list unreconciled rows, tick cleared, live difference, finalize **only when difference = 0**, stamps rows, **posts no journal entries**. Remaining gaps vs Phase D:
- ⚠️ **Lock integrity:** `DELETE /reconciliations/:id` (undo) unstamps rows and hard-deletes the record with no guard or audit — a reconciled period CAN be silently altered. Fix: only the most-recent reconciliation for an account may be undone; undo recorded in the operational audit log; (optionally admin-only — already role-guarded).
- ⚠️ FE polish to production bar (states already exist; re-verify difference-to-zero UX).

## 5. Everything else from the Phase E list — already in place (verify, don't rebuild)
Idempotency keys (global interceptor + unique index; acceptance #15), period lock (#16), tenant/role isolation (chunk-1 suite 58/58 incl. header spoofing), concurrency (no overpay #19; JE reference race fixed via company-row lock), atomic balance updates (raw SQL `UPDATE ... RETURNING`), reports read the ledger not cached balances (verified §2).

## 6. Proposed phase order
1. **B-core (the real gap):** delivery-approval ledger commit (Dr COGS / Cr Inventory at avg cost, atomic, replacing the CHUNK2 marker) + **weighted-average cost method** on PO receipt (documented).
2. **D-hardening:** reconciliation undo lock (latest-only + audited).
3. **C invariants as tests:** extend the acceptance suite — BS Inventory = Valuation total; BS AR (GL 1100) = Σ open invoices = A/R aging total; BS AP (GL 2000) = Σ open bills = A/P aging total; P&L net = equity movement; plus a long taxed/discounted/split worked example ending with TB off by exactly 0; delivery-approval scenario (approve → COGS/Inventory move, valuation ties).
4. **Sign-off:** ACCOUNTING_SIGNOFF.md with the exact Dr/Cr per document + balanced-TB check per scenario.

Phases A and most of B/C/E are **verification work** (already implemented and green), not implementation — the audit above is the evidence. No accounting rule in the non-negotiable list is currently violated by the engine itself; the two real defects are the un-posted delivery approval and the static cost method, plus the reconciliation undo lock.
