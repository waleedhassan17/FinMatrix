# WAREHOUSE_QA_AUDIT — warehouse + delivery-personnel end-to-end audit

QA.md audit, 2026-07-11. Environment: local server running the exact deployed code
(main = Heroku v61) on a fresh database seeded with `seed:tier-demos` — the same seed that
produced the live demo companies, so `warehouse@gmail.com` / riders match CREDENTIALS.md.
Every assertion is **delta-based** (before/after) so it holds on non-empty books.

## PHASE 0 — AUDIT SETUP ✅

**Warehouse account** — `warehouse@gmail.com / 123456` signs in; company **Warehouse Co**
(`7b0947e2-…463ca9`), `companyType=warehouse`, status `active`. The warehouse tier carries the
full feature set (inventory, POs, sales orders, deliveries, all reports).

**Required accounts — ALL PRESENT** in Warehouse Co's CoA:

| Code | Account | Code | Account |
|---|---|---|---|
| 1000 | Cash | 2000 | Accounts Payable |
| 1010 | Business Checking | 2050 | Inventory Received Not Billed (GRNI) |
| 1100 | Accounts Receivable | 2300 | Sales Tax Payable |
| 1200 | Inventory | 4000 | Sales Revenue |
| 1250 | Goods in Transit | 5000 | Cost of Goods Sold |
| 1300 | Input Tax (recoverable) | | |

**Riders (delivery personnel)** — both active:
- Saim Raza — `rider1@warehouseco.com / 123456`
- Haseeb Ali — `rider2@warehouseco.com / 123456`

**Delivery flow code path** (assign → rider → approval → posting):

| Stage | Endpoint | Posting |
|---|---|---|
| Assign/dispatch | `POST /deliveries` (admin) → `DeliveryLedgerService.commitStockOnAssign` | Creates non-posting **Sales Order**; posts **Dr 1250 Goods in Transit / Cr 1200 Inventory at COST**; decrements on-hand. Atomic; insufficient stock → 422, nothing half-posted. |
| Rider status | `PATCH /deliveries/:id/status` (role `delivery`) | **Posts nothing.** Server-enforced status machine `pending → picked_up → in_transit → arrived → delivered` (+ `cancelled/failed/returned` branches); terminal states locked; same-status replay = idempotent no-op; skips/backward = 422. |
| Rider POD + paid flag | `POST /deliveries/:id/bill-photo` (role `delivery`, multipart) | **Posts nothing** — creates an `inventory-update-request` queued for admin review. |
| Admin approve | `POST /inventory-update-requests/:id/approve` (roles `admin/staff`) → `DeliveryLedgerService.commitApproval` | Sales Order → **Invoice**; PAID: **Dr 1000 Cash / Cr 4000 Sales (+ Cr 2300 Tax)**; UNPAID: **Dr 1100 A/R / Cr 4000 (+2300)**; both: **Dr 5000 COGS / Cr 1250 GIT**; partial delivery restocks the remainder. Approve-twice → 409. |
| Admin reject / return | `POST /inventory-update-requests/:id/reject` → `releaseOnReject` | **Dr 1200 Inventory / Cr 1250 GIT** (reversal at cost), stock restored, SO cancelled, no revenue ever posted. |
| Later payment | `POST /payments` (Receive Payment) | **Dr 1000 Cash / Cr 1100 A/R**; P&L unchanged. |

**Nothing missing at setup.** Phases 1–4 executed by `FinMatrix-Backend/test/warehouse-qa.acceptance.ts`
(new, kept in the repo — reruns on demand). **Final result: 119 checks, 119 passed, 0 failed.**
After EVERY step the suite asserted: TB balanced, BS balanced (A = L + E), Inventory Valuation = BS 1200,
and GIT-nets-to-zero for completed deliveries — those four invariants held at all 10 checkpoints.

---

## PHASE 1 — INVENTORY & PURCHASE CYCLE ✅ (all pass)

Two items created (A: cost 100/sell 150 · B: cost 40/sell 60), on-hand 0. PO: 30×A + 50×B = **5,000**.

| Step | Expected JE | Actual JE (captured from GL) | Reports | ✅ |
|---|---|---|---|---|
| Create items | none | *(no GL rows)* | — | ✅ |
| Create PO | none (non-posting) | *(no GL rows)* | TB/BS balanced | ✅ |
| Receive PO | Dr 1200 Inventory 5,000 / Cr 2050 GRNI 5,000 | `Dr 1200 5000 / Cr 2050 5000 (po_receipt)` | on-hand A=30, B=50; BS Inventory **+5,000**; Valuation ties; GRNI +5,000 | ✅ |
| Vendor bill | Dr 2050 GRNI 5,000 / Cr 2000 A/P 5,000 | `Cr 2000 5000; Dr 2050 2000 + Dr 2050 3000 (bill)` — GRNI debited per line, same total | **GRNI delta = 0** (nets out); A/P **+5,000**; Inventory untouched (no double count) | ✅ |

## PHASE 2 — MASTERS ✅

Customer + vendor creation posted **nothing** (no GL rows). A/P aging shows the vendor's open bill at
exactly 5,000. (A/R aging tie verified in 3e/3f below.)

## PHASE 3 — DELIVERY ↔ ACCOUNTING ✅ (every state posts correctly)

**3a — assign 20×A to rider1 (sell 150, tax 10%).** Sales Order created (non-posting echo in the
dispatch response). JE exactly `Dr 1250 GIT 2000 / Cr 1200 Inventory 2000 (delivery_dispatch)` — at
COST. On-hand 30→10; GIT delta +2,000; **no revenue, no COGS** (P&L delta 0). ✅

**3b — over-allocation guard.** Assigning 999×A → **422** `INSUFFICIENT_STOCK`-class error; zero GL
rows written (nothing half-posted); on-hand unchanged at 10; books balanced. Inventory can never go
negative through dispatch. ✅

**3c — rider flow (as rider1/rider2).**
- rider1 sees his delivery in `/deliveries/my/assigned`; **rider2 does NOT see rider1's** ✅
- Rider token got **403 on all nine** accounting surfaces probed: trial balance, balance sheet, P&L,
  chart of accounts, journal entries, invoices, payments, purchase orders, bills ✅
- Status machine: `pending → arrived` skip **rejected** (400 `ILLEGAL_STATUS_TRANSITION` with
  from/to/allowed in the error); `picked_up` ok; **double-tap = idempotent no-op** (`idempotentReplay:
  true`, no duplicate history row); backward `in_transit → picked_up` **rejected** ✅
- Marked PAID + uploaded proof photo → 201 with a queued approval request and **zero GL rows** ✅
- Rider **403 on the approval endpoint** for his own POD ✅

**3d — admin approves the PAID delivery.** Expected Dr Cash 3,300 / Cr Sales 3,000 / Cr Tax 300 +
Dr COGS 2,000 / Cr GIT 2,000. Actual (engine posts invoice-then-payment, netting to the same):

```
Dr 1100 A/R 3300, Cr 4000 Sales 3000, Cr 2300 Tax 300   (invoice)
Dr 1000 Cash 3300, Cr 1100 A/R 3300                     (payment — nets A/R to 0)
Dr 5000 COGS 2000, Cr 1250 GIT 2000                     (delivery_approval)
```
Cash +3,300 · GIT **nets to zero** · A/R net 0 · P&L revenue +3,000, COGS +2,000 (GP 1,000) ·
GL rows link back (invoice rows carry the approval's `invoiceId` as source). ✅

**3e — NOT-PAID delivery (10×B via rider2).** `Dr 1100 A/R 660 / Cr 4000 600 / Cr 2300 60 (invoice)`
+ `Dr 5000 COGS 400 / Cr 1250 GIT 400 (delivery_approval)`; **no payment row**. Open invoice appears in
A/R aging at 660 for this customer; GIT nets to zero; books balance. ✅

**3f — later Receive Payment.** `Dr 1000 Cash 660 / Cr 1100 A/R 660 (payment)`; invoice → **paid**;
A/R aging drops to 0 for the customer; **P&L unchanged** by the payment; A/R back to baseline. ✅

**3g — returned delivery (5×A).** Rider walks picked_up → in_transit → **returned**; server posts the
reversal immediately: `Dr 1200 Inventory 500 / Cr 1250 GIT 500 (delivery_return)`. Stock restored to
pre-dispatch; **no revenue, no COGS** ever posted; GIT nets to zero. ✅

**3h — idempotency.** Approving the same POD twice → **409**; cash delta still exactly +3,300 —
**no double posting**. ✅

## PHASE 4 — REPORTS TIE-OUT ✅

- Trial Balance: debits = credits (544,001.30 both sides at close) ✅
- P&L run deltas: Sales **+3,600**, COGS **+2,400**, gross profit +1,200 — exactly the two approved
  deliveries ✅
- Balance Sheet balanced; Inventory line **= Inventory Valuation** ✅
- **GRNI delta 0** after the full purchase cycle ✅ · **GIT delta 0** — every delivery this run
  completed ✅ · inventory never negative ✅
- Net inventory delta ties arithmetically: +5,000 (received) − 2,000 (sold A) − 400 (sold B) = **+2,600** ✅
- Every GL row in the company carries `source_type` + `source_id` — each ledger line links back to its
  delivery / invoice / payment / PO / bill ✅
- Revenue was never recognized before delivered + approved (asserted at assign, POD, and return) ✅

## PHASE 5 — BUGS FOUND & FIXED

**No product bugs found.** The one initial ❌ (A/P aging row not matched) was a defect in the QA
script itself — the A/P aging API returns the vendor's name in a `customerName` field (shared aging
row shape). The app's serializer already maps it, and the report's numbers are correct; the check was
corrected to the actual field. Logged as a **cosmetic API-shape observation**, not a defect — renaming
the field would break the deployed app for zero accounting benefit.

Second observation: illegal status transitions return **400** (`ILLEGAL_STATUS_TRANSITION`, with
`from`/`to`/`allowed` detail) rather than 422 — a clear, correct rejection; noted only for API-contract
documentation.

## VERIFY

| Gate | Result |
|---|---|
| warehouse-qa.acceptance.ts (this audit) | **119/119** |
| Existing delivery-ledger acceptance (fresh-company engine test) | **83/83** |
| Backend unit tests (`npx jest`) | **46/46** |
| Backend `npx tsc --noEmit` / `nest build` | clean |
| Frontend `npx tsc --noEmit` | clean |

## VERDICT — production-ready ✅

The warehouse and delivery-personnel views are **production-ready for the audited scope**: every
delivery state posts the correct journal entry at the correct moment (cost at dispatch, revenue+COGS
only at admin approval, clean reversal on return), Goods in Transit nets to zero for every completed
delivery, GRNI nets to zero across the purchase cycle, riders are fully fenced off from accounting
(server-enforced 403s + own-deliveries-only), over-allocation is blocked atomically, double
approval/double-tap cannot double-post, and Trial Balance / Balance Sheet stayed balanced through all
ten checkpoints on non-empty books.

Remaining gaps (outside this audit's scope, listed for honesty):
- A/P aging's `customerName` field naming (cosmetic, above).
- Rider media upload ACL and delivery photo storage were hardened in phase2/phase3 work and were not
  re-audited here beyond "POD posts nothing".
- The audit ran the deployed code locally against the demo seed; the same suite can be pointed at
  production (`BASE_URL`/`PG_URL`) but intentionally was not, to keep live demo books clean.
