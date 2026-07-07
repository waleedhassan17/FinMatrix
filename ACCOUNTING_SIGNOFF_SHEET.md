# ACCOUNTING SIGN-OFF SHEET — Delivery ↔ Ledger (phase1.md)

Verified end-to-end against a real Postgres via `npm run test:delivery-ledger`
(83/83 ✅) and the regression gate `npm run test:chunk2` (89/89 ✅) on 2026-07-07.
After **every** scenario the suite asserted: Trial Balance ΣDr = ΣCr (exactly),
Balance Sheet A = L + E, Inventory Valuation = GL 1200, and Goods in Transit
(1250) netting to zero for completed deliveries.

Worked example: item cost 100, price 150, tax 10%.

## Exact debits/credits per delivery state

| # | State / action | Entry posted | Verified |
|---|---|---|---|
| 1 | **Assign (Stage 1)** — 4 units | Dr Goods in Transit 1250 **400** / Cr Inventory 1200 **400** (frozen avg cost). Sales Order created — **non-posting**. On-hand 20 → 16. | ✅ TB/BS balanced; **no revenue** at dispatch (P&L revenue = 0); valuation ties |
| 2 | **Rider marks PAID / NOT PAID (Stage 2)** | **NOTHING.** Flag rides into the approval queue. | ✅ 1250 unchanged, Cash/A-R unchanged after POD |
| 3 | **Admin approves, PAID (Stage 3)** | Invoice: Dr A/R **660** / Cr Sales 4000 **600** / Cr Tax Payable 2300 **60** ‖ Payment: Dr Cash 1000 **660** / Cr A/R **660** (net = Dr Cash / Cr Sales / Cr Tax) ‖ Cost: Dr COGS 5000 **400** / Cr Goods in Transit 1250 **400** | ✅ Cash +660, 2300 +60, P&L rev 600 / COGS 400, **1250 → 0**, A/R 0 |
| 4 | **Admin approves, NOT PAID** — 3 units | Dr A/R 1100 **495** / Cr Sales **450** / Cr Tax **45** ‖ Dr COGS **300** / Cr GIT **300** | ✅ open invoice = 495 in A/R **and** A/R Aging; **1250 → 0** |
| 5 | **Later payment (Stage 4)** | Existing Receive Payment: Dr Cash **495** / Cr A/R **495** — no new mechanism | ✅ A/R → 0, TB/BS balanced |
| 6 | **Reject / return** — 5 units | Dr Inventory 1200 **500** / Cr Goods in Transit 1250 **500** (`reversalOfId` → Stage-1 entry). Stock restored, SO cancelled. **No revenue posted or reversed.** | ✅ on-hand restored, revenue unchanged, **1250 → 0** |
| 7 | **Partial (2 delivered / 2 returned of 4)** | Dr A/R **330** / Cr Sales **300** / Cr Tax **30** ‖ Dr COGS **200** + Dr Inventory **200** / Cr GIT **400** (single balanced entry) | ✅ invoiced only the delivered part; remainder restocked; **1250 → 0** |
| 8 | **Pre-paid dispatch** — 2 units | At assign: Invoice (Dr A/R 330 / Cr Sales 300 / Cr Tax 30) + Payment (Dr Cash 330 / Cr A/R 330) + Dr GIT 200 / Cr 1200 200. At approve: Dr COGS **200** / Cr GIT **200** only. | ✅ cash at dispatch; approval posts cost only; **1250 → 0** |

## Controls verified (server-enforced)

- ✅ Rider token **cannot approve or reject** (`403` from RolesGuard) and can never post; only admin approval posts.
- ✅ **Approve-twice** returns `409` and does not double-post (request-status guard + `ledger_status` guard); balances byte-identical after replay.
- ✅ **Undo** of a ledger-committed approval is blocked (`409 LEDGER_COMMITTED`) — voids must reverse via invoice-void/credit-memo; nothing is ever deleted.
- ✅ **Insufficient stock** at dispatch → `422 INSUFFICIENT_STOCK`, whole assignment rolls back (nothing half-posted).
- ✅ Every posting goes through the shared **PostingService** (period lock, Dr=Cr enforcement, serialized JE refs, GL rows) in the **same transaction** as the stock movement; entries carry `sourceType/sourceId` (`delivery_dispatch` / `delivery_approval` / `delivery_return` → delivery id; invoice/payment entries link their documents).
- ✅ Cost basis is **frozen at dispatch** (`delivery_items.unit_cost`), so 1250 is relieved with exactly what was debited even if weighted-average cost drifts.
- ✅ Reports are ledger-derived: entries flow into Trial Balance, P&L, Balance Sheet, A/R Aging and Inventory Valuation automatically (all assert-checked).

## Confirmation

- No accounting rule was violated in any scenario: total debits equalled total
  credits and Assets = Liabilities + Equity after every step of both suites.
- **Revenue is never recognized before delivery + admin approval** (sole,
  deliberate exception: the pre-paid option, where the sale is collected before
  dispatch and is invoiced at Stage 1 per the approved design).
- **Goods in Transit (1250) netted to zero for every completed delivery**, and
  GL 1250 lifetime debits = credits across the entire run.

`npx tsc --noEmit` clean on both repos; backend `nest build` clean.
