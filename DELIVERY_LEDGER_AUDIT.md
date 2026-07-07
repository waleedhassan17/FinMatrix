# DELIVERY → LEDGER AUDIT (phase1.md, Phase 0)

Audit of the current delivery lifecycle across FinMatrix (RN/Expo) and FinMatrix-Backend
(NestJS/TypeORM/Postgres), before linking deliveries to the accounting ledger with the
Goods in Transit (1250) model.

---

## 1. Current delivery lifecycle

### Assign (admin)
- `POST /deliveries` (`DeliveriesService.create`) — creates `deliveries` + `delivery_items`
  rows. Items carry `itemId` (inventory item uuid), `orderedQty`, `unitPrice`.
  Status `pending` if `personnelId` supplied, else `unassigned`.
- `POST /deliveries/assign` (`assignDeliveries`), `POST /deliveries/:id/auto-assign`
  (`autoAssign`), `PATCH /deliveries/:id` (`update` with `personnelId`) — set the rider and
  flip `unassigned → pending`.
- **Inventory touched: NO. Ledger touched: NO. No Sales Order / Invoice is created.**

### Rider statuses
- `PATCH /deliveries/:id/status` — server-enforced state machine
  (`unassigned → pending → picked_up → in_transit → arrived → delivered`, plus
  `cancelled/failed/returned`), row-locked, idempotent replay, rider ownership enforced
  (`NOT_YOUR_DELIVERY`), riders cannot cancel. **No inventory, no ledger.**
- `POST /deliveries/:deliveryId/bill-photo` (`BillPhotoController` →
  `InventoryApprovalsService.submitBillPhoto`, role `delivery`) — THE rider completion path.
  In one transaction: validates assignment + duplicate-request guard, creates a pending
  `inventory_update_requests` (+ `..._request_lines` with per-item
  `beforeQty/deliveredQty/returnedQty`), uploads the photo, updates
  `shadow_inventory_snapshots` for the rider (currentQty −delivered +returned,
  syncStatus `pending`), notifies admins. **No on-hand inventory change, no ledger.**
  There is currently **no paid / not-paid flag anywhere** in the model.
- `POST /deliveries/:id/confirm` (`confirmDelivery`) — writes deliveredQty/returnedQty on
  `delivery_items` and sets status `delivered`. No inventory, no ledger.

### Shadow inventory
- `shadow_inventory_snapshots` (per rider/item, `originalQty/currentQty/syncStatus`).
  Written by `submitBillPhoto`, zeroed on approve, reverted on reject/undo. Pure quantity
  shadow — **no accounting form of it exists today** (this is what 1250 will become).

### Inventory-approval queue (admin)
- `GET /inventory-update-requests` (+ legacy `/inventory-approvals`),
  `POST /inventory-update-requests/:id/approve|reject|undo` — **`@Roles('admin')` on
  approve/reject/undo; riders get 403 from `RolesGuard`. Riders can never approve or post.**
- `InventoryApprovalsService.approve` (the chunk-1/chunk-2 integration point — the
  `// CHUNK2: commit stock on approval` marker has since been *implemented* here):
  in ONE `dataSource.transaction`:
  - row-locks each inventory item, applies `−delivered +returned` to `quantityOnHand`
    with a negative-stock guard, writes `inventory_movements`,
  - **posts Dr COGS (5000) / Cr Inventory (1200)** at weighted-average `unitCost` through
    the shared `PostingService` (`sourceType 'delivery_approval'`, `sourceId = request.id`,
    link kept in `inventory_update_requests.journal_entry_id`),
  - zeroes shadow inventory, sets the delivery `delivered`, audits, notifies.
- `undoApproval` restores quantities and posts the **exact reversal** of that entry
  (`reversalOfId`), returning the request to pending.

### What posts to the ledger today — confirmation
- **Assignment posts NOTHING.** Dispatched goods silently remain in Inventory (1200) until
  approval — there is no Goods in Transit; the "shadow" is quantity-only.
- **Approval posts ONLY Dr COGS / Cr Inventory. There is NO revenue side at all**: no Sales
  Order, no Invoice, no Cash/AR entry for delivered goods. Goods leave the warehouse and the
  P&L shows cost with zero revenue. This is the gap phase1.md closes.

## 2. Shared accounting infrastructure to reuse (confirmed)

| Piece | Location | Notes |
|---|---|---|
| PostingService | `src/modules/journal-entries/posting.service.ts` | Single entry point `createEntry(manager, input)`: ≥2 lines, one-sided lines, Dr=Cr for posted, period lock (`booksLockedUntil`), serialized JE refs, balance deltas + GL rows, `sourceType/sourceId`, `reversalOfId`. Exported by `JournalEntriesModule`. |
| Account constants | `src/modules/accounts/accounts.constants.ts` | `ACCT_CASH 1000, ACCT_AR 1100, ACCT_INVENTORY 1200, ACCT_TAX_PAYABLE 2300, ACCT_SALES_REVENUE 4000, ACCT_COGS 5000` + `DEFAULT_CHART_OF_ACCOUNTS` + `SYSTEM_ACCOUNT_DEFS` (lazily created via `AccountsService.getOrCreateSystemAccount` for pre-existing companies — **1250 must be added to all three**). |
| Sales Orders | `src/modules/sales-orders/sales-orders.service.ts` | `create` (NON-POSTING, status `open`), `convertToInvoice` (creates a `sent` invoice → posts revenue). Both wrap their own `dataSource.transaction` → need in-transaction variants to stay atomic with stock moves. |
| Invoices | `src/modules/invoices/invoices.service.ts` | `create` with status `sent` posts Dr A/R / Cr Sales / Cr Tax; **lines with `itemId` also post COGS + relieve on-hand** (`postInvoiceCogs`). Delivery invoices must use item-less lines so cost flows through 1250 instead. |
| Receive Payment | `src/modules/payments/payments.service.ts` | `receive` posts Dr Cash(1000)/Bank(1010) / Cr A/R (1100), applies to invoices oldest-first. Stage 4 needs **no new mechanism**; the PAID case reuses this in-transaction. |
| Money & guards | `common/utils/money.util.ts` (Decimal), period lock in PostingService, `RolesGuard` + `CompanyGuard` (companyId/role from JWT) | Non-negotiables already enforced centrally. |
| Reports | `src/modules/reports` | Ledger-derived (TB/BS/P&L/A-R aging/valuation) — a new 1250 asset account flows in automatically. |

## 3. Design deltas the implementation must handle (found in audit)

1. **Approval currently reduces on-hand; Stage 1 moves that to assignment.** For deliveries
   dispatched under the new flow, approve must NOT touch on-hand for the delivered part
   (it already left at Stage 1) and must ADD BACK the returned/undelivered part.
   Legacy requests (no Stage-1 commit) must keep the old behaviour — flag on the delivery
   (`stock_committed_at`) decides which path.
2. **Cost basis must be frozen at dispatch.** Weighted-average `unitCost` can drift between
   dispatch and approval; Stage 3 must credit 1250 with the SAME per-line cost Stage 1
   debited, or 1250 will not net to zero → store `unit_cost` on `delivery_items`.
3. **Invoice lines must be item-less** for delivery invoices (see §2) to avoid
   double-relieving inventory/COGS.
4. **`undoApproval` cannot simply reverse one entry any more** (approval now produces
   invoice + optional payment + COGS entries). Undo is blocked for ledger-committed
   deliveries with a clear error (use void/credit-memo flows).
5. **Atomicity**: `InvoicesService.create`, `PaymentsService.receive`, `SalesOrdersService.create`
   each open their own transaction → extract manager-accepting variants so Stage 1/Stage 3 run
   in ONE transaction with the stock movement.
6. Partial deliveries: approve invoices the **delivered** quantities; everything not
   delivered returns to Inventory (Dr 1200 / Cr 1250) and restocks — 1250 always nets to 0
   per completed delivery.

## 4. Files that will change

### Backend (FinMatrix-Backend)
- `src/modules/accounts/accounts.constants.ts` — add `ACCT_GOODS_IN_TRANSIT = '1250'` to
  chart, constants, `SYSTEM_ACCOUNT_DEFS`.
- `src/database/migrations/1783740000000-DeliveryLedgerLink.ts` — NEW:
  `deliveries.paid_status / prepaid / sales_order_id / invoice_id / git_journal_entry_id /
  stock_committed_at / ledger_status`, `delivery_items.unit_cost`.
- `src/modules/deliveries/entities/delivery.entity.ts`, `entities/delivery-item.entity.ts` — new columns.
- `src/modules/deliveries/delivery-ledger.service.ts` — NEW: Stage-1 commit
  (SO or prepaid Invoice+Payment, Dr 1250 / Cr 1200 at cost, on-hand ↓, movements, idempotent)
  and Stage-3 helpers (invoice from delivered qty, paid → payment, COGS from 1250, reversal path).
- `src/modules/deliveries/deliveries.service.ts` — call Stage-1 commit from
  `create`/`assignDeliveries`/`autoAssign`/`update`; expose ledger info.
- `src/modules/deliveries/deliveries.module.ts` — wire JournalEntries/Accounts/SalesOrders/
  Invoices/Payments/Inventory deps.
- `src/modules/deliveries/dto/delivery.dto.ts` — `prePaid`, per-item `taxRate`, rider
  `paidStatus` on confirm.
- `src/modules/inventory-approvals/inventory-approvals.service.ts` — Stage 2 store
  `paidStatus`; Stage 3 approve/reject rewritten for GIT deliveries; block undo for
  ledger-committed; expose paid flag + amounts in `formatRequest`.
- `src/modules/inventory-approvals/dto/inventory-approval.dto.ts` — `paidStatus` on
  `SubmitBillPhotoDto`.
- `src/modules/sales-orders/sales-orders.service.ts` — extract `createInTransaction`.
- `src/modules/invoices/invoices.service.ts` — extract `createInTransaction`.
- `src/modules/payments/payments.service.ts` — extract `receiveInTransaction`.
- `test/delivery-ledger.acceptance.ts` — NEW acceptance scenarios (Phase C).
- `package.json` — script for the new acceptance file.

### Frontend (FinMatrix)
- `src/screens/Delivery/Personnel/BillPhotoCapture/*` — PAID / NOT PAID choice (+ "posts
  nothing until admin approval" note), send `paidStatus`.
- `src/screens/Delivery/Admin/InventoryApproval/*` — show PAID/NOT PAID flag, amount,
  customer on each pending request; approve/reject already wired.
- `src/screens/Delivery/Admin/CreateDelivery/*` — pre-paid option; post-assign confirmation
  (Sales Order created, stock → Goods in Transit).
- `src/screens/Delivery/Admin/AssignDeliveries/*` (slice/serializer as needed) — surface
  ledger confirmation from assign response.
- `src/network/deliveryNetwork.ts`, serializers/models for the new fields.

## 5. Exact entries to implement (from phase1.md, restated for sign-off)

| Event | Entry |
|---|---|
| Stage 1 assign | Dr Goods in Transit 1250 / Cr Inventory 1200 (qty × frozen unit cost); SO created (non-posting). Prepaid: Invoice(sent) posts Dr A/R / Cr Sales / Cr 2300, Payment posts Dr Cash / Cr A/R. |
| Stage 2 rider paid/unpaid | **No posting.** Flag only. |
| Stage 3 approve, PAID | Invoice: Dr A/R / Cr Sales 4000 / Cr Tax 2300 + Payment: Dr Cash 1000 / Cr A/R (net = Dr Cash / Cr Sales / Cr Tax) ‖ Dr COGS 5000 / Cr GIT 1250. |
| Stage 3 approve, NOT PAID | Dr A/R 1100 / Cr Sales 4000 / Cr Tax 2300 ‖ Dr COGS 5000 / Cr GIT 1250. Invoice ages in A/R. |
| Stage 3 reject / returned qty | Dr Inventory 1200 / Cr GIT 1250 at frozen cost; restock; **no revenue reversed**. |
| Stage 4 later payment | Existing Receive Payment: Dr Cash / Cr A/R. |

Invariants asserted after every scenario: ΣDr=ΣCr, Assets=L+E, and **1250 nets to 0 for every
completed delivery**.
