ROLE: Act as a senior QA engineer + accountant. Work across FinMatrix (React Native + Expo) and
FinMatrix-Backend (NestJS + TypeORM + PostgreSQL). GOAL: end-to-end test the delivery module — create a
delivery as admin, assign it to rider "Saim", drive the full rider flow, run admin approval, and prove
everything is linked to inventory and accounting so a warehouse never manages accounting by hand. This is a
QuickBooks-competitor product: everything must be accurate and production-ready.

TEST ACCOUNTS (dummy, non-live app):
- Admin: metromatrix@gmail.com / 123456
- Delivery personnel (Saim): saim@metromatrix.com / 123456

PHASE 0 — AUDIT (produce DELIVERY_E2E_AUDIT.md, then STOP):
Map the delivery flow across both repos and report where it touches inventory and the ledger, plus any gaps.
Confirm the shared PostingService, the Goods-in-Transit account, and the approval-posts-the-sale logic exist
(or flag them missing). List every file involved. Output, then proceed.

PHASE A — RUN THE FULL FLOW AND VERIFY EACH STEP (drive the app/API as the accounts above):

1. ADMIN CREATES & ASSIGNS A DELIVERY to Saim (use a seeded item with a known on-hand qty, e.g. 12 units):
   - A Sales Order (non-posting) is created.
   - Stock posts: Dr Goods in Transit / Cr Inventory at cost; on-hand quantity drops.
   - OVER-ALLOCATION IS REJECTED: assigning 13 when only 12 exist fails with a clear message; inventory
     never goes negative. Zero/negative/non-integer quantities also rejected.
   - Concurrent assignment can't oversell the same stock.

2. RIDER (SAIM) VIEW — logged in as saim@metromatrix.com:
   - Saim sees ONLY his own deliveries; cannot open admin or financial screens.
   - Status machine works: picked_up → in_transit → arrived → delivered; skipping/going backward is
     rejected; a double-tap can't advance twice (idempotent).
   - Saim marks the delivery PAID or NOT PAID; the flag persists into the admin approval queue.
   - Proof-of-delivery photo uploads to Cloudinary (not local disk), viewable only by owner/admin, survives
     a backend restart.
   - The rider action posts NOTHING to the ledger; a rider token gets 403 on any posting/approval/financial
     endpoint.

3. ADMIN APPROVAL:
   - The pending delivery shows Saim's paid/unpaid flag, amount, and customer.
   - On approve: SO → Invoice; if PAID → Dr Cash, if NOT PAID → Dr Accounts Receivable; Cr Sales; Cr Tax;
     and Dr COGS / Cr Goods in Transit. Goods in Transit for that delivery nets to ZERO.
   - Reject/return path reverses cleanly (Dr Inventory / Cr Goods in Transit), restocks, posts no revenue.
   - Approving twice does not double-post (idempotent).

4. ACCOUNTING & REPORTS LINKAGE (the core proof — no manual accounting for the warehouse):
   - Entries appear in the General Ledger with no invoice/journal created by hand.
   - Reports update automatically: Trial Balance still balances; P&L shows the sale + COGS; Balance Sheet
     balances; a NOT-PAID delivery shows an open invoice in A/R Aging; Inventory Valuation ties to Balance
     Sheet Inventory (+ Goods in Transit).
   - A later Receive Payment on the unpaid invoice clears A/R (Dr Cash / Cr A/R).

PHASE B — FIX EVERYTHING THAT FAILS (frontend or backend):
Fix every failure. Server-side is the source of truth: stock validation, role/tenant isolation, posting
correctness, idempotency. Re-run until all pass. Do NOT weaken a check to make it pass.

PHASE C — HARDEN & LOCK IT IN:
- Add these as automated tests in test/acceptance.ts so they run every build: over-allocation rejected
  (13 vs 12), exact stock allowed, concurrent assignment can't oversell, inventory never negative, full
  assign→deliver→approve(paid & unpaid)→ledger cycle, return reversal, status-machine integrity, approve
  idempotency, rider 403 on financial endpoints.
- After every scenario assert: Trial Balance balances, Balance Sheet balances, Goods in Transit nets to
  zero for completed deliveries, Inventory Valuation ties out.
- `npx tsc --noEmit` clean both repos; backend builds; acceptance suite green.

DELIVERABLES: DELIVERY_E2E_AUDIT.md; small commits per phase; the automated tests; and a QA SIGN-OFF SHEET
listing each step (create, assign, over-allocation, Saim status flow, paid approval, unpaid approval, return,
later payment, each report) with expected vs actual and pass ✅. End with an honest statement: is the
delivery module production-ready and fully linked to accounting, and list any remaining gaps. Only give the
"production ready" thumbs-up if every check genuinely passes.