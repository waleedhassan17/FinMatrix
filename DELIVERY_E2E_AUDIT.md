# DELIVERY MODULE — END-TO-END AUDIT (phase2.md, Phase 0)

**Date:** 2026-07-08
**Scope:** FinMatrix (React Native + Expo) + FinMatrix-Backend (NestJS + TypeORM + PostgreSQL)
**Question:** is the delivery flow fully linked to inventory and the accounting ledger, so a
warehouse never manages accounting by hand — and where are the gaps?

---

## 1. Verdict up front

The delivery ↔ ledger link **exists and is architecturally complete**. It was built as the
"Goods in Transit 1250" model (phase1) on top of the shared `PostingService`, and the
approval-posts-the-sale logic is present. The three things phase2.md asks to confirm:

| Required piece | Status | Where |
|---|---|---|
| Shared `PostingService` | ✅ EXISTS | `src/modules/journal-entries/posting.service.ts` (`class PostingService`, line 50) — same engine used by invoices, bills, payments, credit memos, payroll. Rejects unbalanced entries, enforces period lock, updates account balances + GL atomically. |
| Goods-in-Transit account | ✅ EXISTS | Account **1250 Goods in Transit** (`ACCT_GOODS_IN_TRANSIT`), in `DEFAULT_CHART_OF_ACCOUNTS` + `SYSTEM_ACCOUNT_DEFS`; lazily created for pre-existing companies via `getOrCreateSystemAccount`. |
| Approval posts the sale | ✅ EXISTS | `InventoryApprovalsService.approve` → `DeliveryLedgerService.commitApproval` (invoice + payment-if-paid + Dr COGS / Cr GIT), with `releaseOnReject` full reversal and legacy fallback for pre-GIT deliveries. |

One **concrete defect** was found by code inspection (§5, GAP-1: quantity validation), plus a
set of behaviors that must be **proven by execution** in Phase A rather than assumed.

---

## 2. Flow map (three stages + reports)

```
STAGE 1 — ADMIN CREATES/ASSIGNS (deliveries.service.ts create/assign/autoAssign/update)
  └── DeliveryLedgerService.commitStockOnAssign (delivery-ledger.service.ts:99)
        • row-locks the delivery + each inventory item (pessimistic_write)
        • validates on-hand: INSUFFICIENT_STOCK if qty > quantityOnHand (:152-158)
        • decrements items.quantity_on_hand
        • creates a SALES ORDER (non-posting)  — or Invoice+Payment if prePaid
        • posts JE:  Dr 1250 Goods in Transit / Cr 1200 Inventory  (at cost,
          frozen on delivery_items.unit_cost)
        • idempotent: deliveries.stock_committed_at + ledger_status
          ('none'|'in_transit'|'committed'|'returned')

STAGE 2 — RIDER (Saim) DRIVES THE DELIVERY
  • status machine (deliveries.service.ts:44 LEGAL_TRANSITIONS):
      pending → picked_up → in_transit → arrived → delivered
      – skips rejected (ILLEGAL_STATUS_TRANSITION), terminal states final
      – replaying the same status = idempotent no-op (:379-383)
      – rider ownership enforced: NOT_YOUR_DELIVERY 403 (:365, :503)
  • paid/unpaid flag: rider posts bill-photo (multipart) or confirm →
    deliveries.paid_status ('paid'|'unpaid') — POSTS NOTHING to the ledger
  • POD photo → StorageService: Cloudinary when CLOUDINARY_URL set
    ("cld:" keys), else Postgres bytea ("db:" keys) — never dyno disk
  • creates an inventory-approval request for the admin queue

STAGE 3 — ADMIN APPROVAL (inventory-approvals.service.ts approve/reject)
  • approve → DeliveryLedgerService.commitApproval (:292):
      – SO → INVOICE for delivered qty (item-less lines so the invoice
        COGS path is skipped — cost flows through GIT instead)
      – PAID   → PaymentsService.receiveInTransaction: Dr Cash / Cr A/R
      – UNPAID → invoice stays open: Dr A/R / Cr Sales (+ Cr Tax)
      – single cost entry: Dr 5000 COGS (+ Dr 1200 for any returned part)
        / Cr 1250 GIT IN FULL at frozen cost → GIT nets to ZERO
  • reject → releaseOnReject (:521): Dr 1200 Inventory / Cr 1250 GIT,
    restocks quantity_on_hand, cancels the SO, NO revenue posted
  • idempotent: second approve → 409, books unchanged; undo blocked (409)
    for ledger-committed deliveries
  • legacy deliveries (created pre-GIT) route to applyLegacyApproval (:494)

REPORTS (all GL-derived, no manual journal)
  general_ledger rows → Trial Balance, P&L (Sales + COGS), Balance Sheet,
  A/R Aging (open invoice for unpaid deliveries), Inventory Valuation
  (ties to BS 1200; 1250 holds in-transit value), Cash Flow.
  Receive Payment later: Dr Cash / Cr A/R via PostingService.
```

## 3. Accounting entries (expected, per phase2.md)

| Event | Debit | Credit |
|---|---|---|
| Assign to rider | 1250 Goods in Transit (cost) | 1200 Inventory (cost) |
| Rider status / paid flag / POD | — nothing — | — nothing — |
| Approve (PAID) | 1000 Cash | 1100 A/R (via invoice+payment: Dr A/R / Cr Sales 4000 / Cr Tax 2300, then Dr Cash / Cr A/R) |
| Approve (UNPAID) | 1100 A/R | 4000 Sales (+ 2300 Tax) |
| Approve (cost side, both) | 5000 COGS | 1250 Goods in Transit (full frozen cost → nets to 0) |
| Reject / return | 1200 Inventory | 1250 Goods in Transit |
| Later Receive Payment | 1000 Cash | 1100 A/R |

## 4. Files involved

### Backend (`FinMatrix-Backend/FinMatrix-Backend/src`)
- `modules/deliveries/deliveries.service.ts` — CRUD, assign/auto-assign, LEGAL_TRANSITIONS status machine, rider ownership, confirm
- `modules/deliveries/delivery-ledger.service.ts` — **the ledger link**: commitStockOnAssign / commitApproval / releaseOnReject, stock validation + row locks
- `modules/deliveries/deliveries.controller.ts` — routes; @Roles per endpoint (create/assign = admin,staff; status/confirm include delivery; rider list scoped `d.personnelId = user.id`)
- `modules/deliveries/dto/delivery.dto.ts` — DeliveryItemDto (**GAP-1 lives here**), Create/Update/Status DTOs
- `modules/deliveries/entities/{delivery,delivery-item,delivery-status-history,...}.entity.ts` — paid_status, ledger_status, stock_committed_at, unit_cost
- `modules/inventory-approvals/inventory-approvals.service.ts` — approve → commitApproval; reject → releaseOnReject; undo 409 for committed; enrichWithDelivery (paid flag/amount/customer for the queue)
- `modules/inventory-approvals/{inventory-approvals,inventory-update-requests,bill-photo}.controller.ts` — approval queue + POD/paid-flag intake; RolesGuard enforced
- `modules/journal-entries/posting.service.ts` — shared PostingService
- `modules/inventory/…` — quantity_on_hand source of truth
- `modules/invoices|sales-orders|payments/…` — `createInTransaction` / `receiveInTransaction` (atomic variants used by the ledger link)
- `modules/ledger/ledger.controller.ts`, `modules/reports/reports.controller.ts` — GL + reports, @Roles('admin','staff') only
- `common/storage/storage.service.ts` — Cloudinary (`cld:`) / Postgres bytea (`db:`) POD storage
- `common/guards/roles.guard.ts`, `company.guard.ts` — role/tenant isolation
- `database/migrations/1783740000000-DeliveryLedgerLink.ts` — schema
- `test/delivery-ledger.acceptance.ts` — existing 8-scenario suite (83 checks)

### Frontend (`FinMatrix/src`)
- `screens/Delivery/Admin/CreateDelivery…` — item picker from main inventory, prePaid checkbox
- `screens/Delivery/Admin/AssignDeliveries…` — assignment + SO/GIT summary from `ledger` echo
- `screens/Delivery/Admin/InventoryApproval/InventoryApprovalScreen.tsx` — approval queue: paid badge, customer, saleAmount, approve/reject/undo
- `screens/Delivery/Personnel/…` — DP dashboard, delivery detail (status buttons), BillPhotoCapture (**PAID/NOT-PAID required toggle** + POD photo)
- `screens/Delivery/Personnel/BillPhotoCapture/dpBillPhotoCaptureSlice.ts`, `network/dpBillPhotoCaptureNetwork.ts` — multipart upload w/ paidStatus
- `models/deliveryModel.ts`, `serializers/deliverySerializer.ts`, `network/deliveryNetwork.ts`
- Navigation: rider lands in DeliveryTabNavigator (no admin/financial screens registered); server 403s are authoritative

## 5. Gaps & risks found in code review

**GAP-1 (defect — will fix in Phase B): quantity not validated as a positive integer.**
`DeliveryItemDto.orderedQty` carries only `@IsDefined()` (`dto/delivery.dto.ts:28`); `quantity`
only `@IsOptional()`. Consequences:
- `orderedQty: 0` or negative → the line is **silently filtered out**
  (`delivery-ledger.service.ts:127` keeps only qty > 0) instead of rejected with a clear message.
- Non-integer (`2.5`) is accepted and dispatches fractional stock.
- Garbage (`"abc"`) behavior unproven — likely NaN → Decimal throw (500, not 400).
phase2.md requires: "Zero/negative/non-integer quantities also rejected."

**GAP-2 (environment, not code): POD → Cloudinary needs `CLOUDINARY_URL` set.**
StorageService prefers Cloudinary but falls back to Postgres bytea (both restart-safe, neither
is local disk). `.env` here has CLOUDINARY_* entries; prod wiring was done in phase5. Phase A
must verify which backend the photo actually lands in and that access is owner/admin-only.

**To PROVE by execution in Phase A (present in code, unproven behaviorally):**
1. Over-allocation 13 vs 12 → 400 INSUFFICIENT_STOCK, message readable, stock unchanged.
2. Exact-stock allocation (12 of 12) succeeds; on-hand → 0, never negative.
3. **Concurrent** assignment of the same stock can't oversell (pessimistic locks exist; race must be tested with parallel requests).
4. Status machine: skip/backward rejected, double-tap idempotent, rider-only + ownership.
5. Rider token → 403 on every posting/approval/financial endpoint (accounts, ledger, reports, journal-entries, invoices, payments, approvals approve/reject).
6. Approve idempotency (409 second time, books unchanged) and reject reversal.
7. Reports linkage after each step: TB balances, BS balances, P&L Sales+COGS, A/R aging open invoice for unpaid, Inventory Valuation ties to BS 1200 (+1250 in transit), GIT nets to 0 per completed delivery.
8. Receive Payment on the unpaid invoice clears A/R.
9. POD photo survives backend restart; non-owner rider cannot fetch it.

**Known non-blockers (documented product decisions):**
- Live GPS tracking disabled (`TRACKING_ENABLED=false`) and admin tracking map removed — out of phase2.md scope.
- Legacy (pre-GIT) deliveries intentionally use the old approval path with no GIT postings.

## 6. Test assets already in place

- `npm run test:delivery-ledger` — 8 ledger scenarios (assign, rider-neutrality, paid/unpaid approve, reject, idempotency, partial, prepaid) with TB/BS/GIT-zero assertions after every scenario.
- `npm run test:acceptance` (`test/acceptance.ts`) — accounting core suite. **Phase C adds the phase2.md delivery scenarios here** (over-allocation, exact stock, concurrency, status machine, rider 403s, full cycles).
- `npm run test:chunk1` — role isolation + status machine (58 checks), `test:chunk2` — accounting parity (89 checks).

— end of Phase 0 audit; proceeding to Phase A —

---

## 7. Post-audit outcome (added after Phases A–C)

All Phase-A checks were executed against a local QA environment and encoded as the permanent
"phase2.md delivery E2E" section of `test/acceptance.ts` (D0–DF). Final: **135/135 acceptance
checks green** plus 83/83 delivery-ledger, 89/89 chunk2, 58/58 chunk1 regression. GAP-1 and
GAP-3 were confirmed and fixed, and three additional defects were found by execution: the POD
guard blocked exact-stock dispatches, cancelled/failed/returned deliveries leaked stock into
1250 forever, and same-second double sign-in 500'd on the refresh-token unique index. Details,
expected-vs-actual per step, and the honest production-readiness statement live in
**`QA_SIGNOFF_DELIVERY_E2E.md`**.
