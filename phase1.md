ROLE: Act as a senior accounting-systems engineer + QA lead + qualified accountant, shipping to production.
Work across FinMatrix (React Native + Expo, Redux Toolkit) and FinMatrix-Backend (NestJS + TypeORM +
PostgreSQL, on Heroku with Cloudinary for files).

MISSION: Link the DELIVERY module to the ACCOUNTING ledger so goods leaving the warehouse are always
accounted for, revenue is recognized correctly, and the rider's paid/not-paid choice drives settlement.
Update BOTH frontend and backend and make it 100% production-ready. This is the most accounting-sensitive
feature in the app — treat every stock movement as something that MUST have a correct ledger consequence.

PRIME DIRECTIVE (verify after every change): total DEBITS = total CREDITS, Assets = Liabilities + Equity,
and — new invariant — "Goods in Transit" nets to ZERO for every completed delivery. If a change could break
any of these, stop and redesign it.

CORE ACCOUNTING MODEL (implement EXACTLY — this is the design, already reviewed):
- Assigning a delivery is NOT a sale. Delivery + admin approval is the sale. Revenue is recognized on
  approval, never at dispatch.
- New asset account "Goods in Transit" (1250) = the accounting form of shadow inventory: cost of goods that
  have left the warehouse but are not yet sold.
- The rider marks each delivery PAID or NOT PAID; that flag rides into the admin approval queue and decides
  the cash side of the sale. The rider action posts NOTHING to the ledger. ONLY admin approval posts.

THE EXACT ENTRIES (post through the existing shared PostingService, atomically, correct signs):

STAGE 1 — Admin assigns delivery:
  • Create a Sales Order (NON-POSTING) for the delivery (or an Invoice + recorded Payment if the sale is
    pre-paid before dispatch).
  • Post the stock leaving the shelf at cost:
        Dr Goods in Transit (1250)      [qty x unit cost]
        Cr Inventory (1200)             [qty x unit cost]
  • Reduce on-hand inventory; the goods now sit in Goods in Transit (shadow).

STAGE 2 — Rider delivers and updates shadow inventory:
  • Rider marks the delivery PAID (cash collected) or NOT PAID (on credit). This attaches the flag and moves
    the delivery into the admin approval queue. NO ledger posting here.

STAGE 3 — Admin approves (THE posting moment). Convert the Sales Order to an Invoice and post two entries:
  Revenue entry — the debit depends on the rider's flag:
      if PAID:      Dr Cash (1000)               Cr Sales (4000)   Cr Tax Payable (2300)
      if NOT PAID:  Dr Accounts Receivable (1100) Cr Sales (4000)   Cr Tax Payable (2300)
  Cost entry (both cases):
      Dr COGS (5000)                 Cr Goods in Transit (1250)
  • NOT PAID leaves an open Invoice that ages normally in A/R.
  • Reject/return path: reverse Stage 1 — Dr Inventory (1200) / Cr Goods in Transit (1250). No revenue
    reverses (nothing was sold). Return stock to on-hand.

STAGE 4 — Later payment (unpaid case): existing Receive Payment clears it — Dr Cash / Cr Accounts
  Receivable. No new mechanism needed.

NON-NEGOTIABLE RULES:
- All postings go through the single PostingService; no posting logic duplicated in the delivery module.
- Each posting + the stock movement is atomic (dataSource.transaction): all-or-nothing.
- Money as decimal (never float); period lock respected; voids/returns reverse (never delete).
- Server-enforced: companyId/role from JWT; a delivery-personnel token can update its own delivery and set
  the paid/unpaid flag, but can NEVER post to the ledger or approve. Only admin approval posts.
- Reports are ledger-derived; the new entries must flow into Trial Balance, P&L, Balance Sheet, A/R Aging,
  Inventory Valuation automatically.

PHASE 0 — AUDIT (produce DELIVERY_LEDGER_AUDIT.md, then STOP for review):
Report the current delivery lifecycle (assign → rider statuses → shadow inventory → inventory-approval
queue) and exactly where it currently touches inventory, and confirm it currently posts NOTHING to the
ledger. Confirm the shared PostingService entry point, the account-resolution constants, and the existing
Sales Order / Invoice / Receive Payment services to reuse. Confirm the chunk-1 `// CHUNK2: commit stock on
approval` integration point. List every file that will change. Output, then proceed.

PHASE A — BACKEND:
1. Add the Goods in Transit (1250) asset account to the seeded chart of accounts + account constants.
2. Add a paidStatus flag ('paid' | 'unpaid') and the linked salesOrderId/invoiceId to the delivery model
   (migration included).
3. STAGE 1: when admin assigns a delivery, in one transaction — create the Sales Order (non-posting; or
   Invoice+Payment if pre-paid), post Dr Goods in Transit / Cr Inventory at cost, and reduce on-hand qty.
4. STAGE 2: rider endpoint to set delivery delivered + paidStatus; pushes into the approval queue; posts
   nothing; server rejects any attempt by a rider to approve or post.
5. STAGE 3: admin approval endpoint — in one transaction — convert SO → Invoice, post the revenue entry
   (Cash if paid, A/R if unpaid) + the COGS entry (Dr COGS / Cr Goods in Transit); mark the delivery
   committed. Reject/return path posts the reversal (Inventory ← Goods in Transit) and restocks.
6. Ensure the entries carry sourceType/sourceId linking back to the delivery + invoice for the audit trail.
7. Idempotency: approving the same delivery twice must not double-post (idempotency key / guard).

PHASE B — FRONTEND:
1. Admin "assign delivery" flow: on assign, show that a Sales Order was created and stock moved to Goods in
   Transit (read-only confirmation); handle the pre-paid option.
2. Delivery-personnel portal: when updating shadow inventory / marking delivered, add a clear PAID / NOT
   PAID choice. Explain it posts nothing until admin approval.
3. Admin approval queue: show each pending delivery with its PAID/NOT PAID flag, the amount, and the
   customer, with Approve and Reject(reason) actions. Approving triggers the Stage 3 posting; the UI then
   reflects the new invoice (paid or open) and updated inventory.
4. All lists: loading/empty/error states, server errors surfaced, tenant-scoped.

PHASE C — HARDENING & VERIFICATION:
- Expand test/acceptance.ts with delivery scenarios: assign → Goods in Transit rises, Inventory falls, no
  revenue; approve PAID → Cash+Sales+Tax, COGS, Goods in Transit → 0; approve NOT PAID → A/R+Sales+Tax,
  COGS, Goods in Transit → 0, invoice open in A/R aging; later Receive Payment clears it; reject/return →
  reversal, stock restored, no revenue; approve-twice idempotency; rider cannot post/approve (403).
- After EVERY scenario assert: Trial Balance balances, Balance Sheet balances, and Goods in Transit nets to
  zero for completed deliveries. Inventory Valuation still ties to the Balance Sheet Inventory + Goods in
  Transit.
- `npx tsc --noEmit` clean both repos; backend builds; full acceptance suite green in CI against a real
  Postgres.

DEFINITION OF DONE (all must pass):
- [ ] Assign moves stock to Goods in Transit; no revenue/COGS yet; Sales Order created.
- [ ] Rider paid/unpaid flag posts nothing; only admin approval posts.
- [ ] Approve PAID debits Cash; approve NOT PAID debits A/R; both post Sales, Tax, and relieve COGS from
      Goods in Transit.
- [ ] Delivered-unpaid appears as an open invoice in A/R Aging; later payment clears it.
- [ ] Reject/return reverses cleanly; no revenue reversed; stock restored.
- [ ] Goods in Transit nets to zero for every completed delivery; Trial Balance + Balance Sheet balance
      after every scenario.
- [ ] Rider cannot post or approve (server-enforced 403); approve is idempotent.
- [ ] Reports (TB, P&L, Balance Sheet, A/R Aging, Inventory Valuation) reflect the entries automatically.
- [ ] tsc clean; acceptance suite green.

DELIVERABLES: DELIVERY_LEDGER_AUDIT.md; small commits per phase; the expanded acceptance suite; and an
ACCOUNTING SIGN-OFF SHEET listing, for each delivery state, the exact debit/credit produced and a ✅ that the
scenario left the Trial Balance balanced and Goods in Transit at zero. Confirm no accounting rule was
violated and revenue is never recognized before delivery+approval.