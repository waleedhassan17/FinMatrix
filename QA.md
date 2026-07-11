ROLE: Act as a senior QA engineer + accountant doing a COMPLETE end-to-end audit of the WAREHOUSE and
DELIVERY-PERSONNEL views in FinMatrix (React Native + Expo) and FinMatrix-Backend (NestJS + TypeORM +
PostgreSQL). Test EVERY feature by actually POSTING entries through the app/API as a real user, verify each
one hits the ledger and reports correctly, and FIX any bug you find (frontend or backend). Do NOT weaken a
check to make it pass. Never break the accounting engine; Trial Balance and Balance Sheet must stay
balanced throughout.

TEST ACCOUNTS (dummy, non-live):
- Warehouse admin: warehouse@gmail.com / 123456
- Delivery personnel (riders): from CREDENTIALS.md (at least 2). If missing, note it and use/create test
  riders.

METHOD: For each step below, perform the action, then CAPTURE the resulting journal entry and check every
report it should affect. After every step assert: Trial Balance balances, Balance Sheet balances (Assets =
Liabilities + Equity), Inventory Valuation ties to the Balance Sheet Inventory line, and Goods in Transit
nets to zero for completed deliveries. Record expected vs actual for each.

PHASE 0 — AUDIT SETUP (produce WAREHOUSE_QA_AUDIT.md, then STOP):
Confirm the warehouse account exists/active with the warehouse feature set; confirm the accounts
Inventory, GRNI, Goods in Transit, COGS, A/R, A/P, Cash/Bank, Sales, Tax Payable exist. Map the delivery
flow's code path (assign → rider status → approval → posting) and confirm where each stage posts. List the
riders available. Output, then proceed.

PHASE 1 — INVENTORY & PURCHASE CYCLE (post real entries)
1. Create 2 inventory items (known unit costs), on-hand 0.
2. Create a Purchase Order → assert it posts NOTHING.
3. Receive the PO → assert Dr Inventory / Cr GRNI; on-hand rises; Inventory Valuation rises; Balance Sheet
   Inventory rises.
4. Enter the vendor Bill → assert Dr GRNI / Cr A/P; GRNI NETS TO ZERO; A/P rises; Inventory unchanged (not
   double-counted).
Report the journal entries + report changes for each; confirm Trial Balance balances.

PHASE 2 — CUSTOMERS/VENDORS & CORE (quick correctness)
Create a customer and vendor; confirm creating them posts nothing; confirm their balances tie to A/R / A/P
and the aging reports as transactions are added.

PHASE 3 — DELIVERY ↔ ACCOUNTING (the core audit — post through every state)
For each sub-case, perform the action and CAPTURE the ledger + report effects:

3a. CREATE & ASSIGN a delivery to a rider (e.g. 20 units, known sell price):
    - Assert a Sales Order is created (non-posting).
    - Assert Dr Goods in Transit / Cr Inventory at COST; on-hand drops; Inventory Valuation drops; NO
      revenue, NO COGS yet.
    - Assert Goods in Transit now holds that cost.

3b. OVER-ALLOCATION GUARD: try to assign MORE than on-hand (e.g. 999 units) → assert REJECTED with a clear
    error; inventory never goes negative.

3c. RIDER FLOW (log in as the rider):
    - Assert the rider sees ONLY their own deliveries and NO accounting screens.
    - Advance the status machine (picked_up → in_transit → arrived → delivered); assert illegal/backward
      transitions rejected and double-tap is idempotent.
    - Mark the delivery PAID; upload proof; assert this posts NOTHING and only queues it for approval.
    - Assert a rider token gets 403 on any accounting/approval/financial endpoint.

3d. ADMIN APPROVES a PAID delivery:
    - Assert Sales Order → Invoice; posts Dr Cash / Cr Sales (+ Cr Tax if taxed) AND Dr COGS / Cr Goods in
      Transit.
    - Assert Goods in Transit for this delivery NETS TO ZERO.
    - Assert reports: P&L shows Sales + COGS (gross profit); Balance Sheet Cash up; Trial Balance balances.

3e. A NOT-PAID delivery (assign → rider delivers, marks NOT PAID → admin approves):
    - Assert Dr Accounts Receivable / Cr Sales (+ Tax) AND Dr COGS / Cr Goods in Transit.
    - Assert an OPEN invoice appears in A/R Aging; Goods in Transit nets to zero; books balance.

3f. LATER PAYMENT on the unpaid delivery (Receive Payment):
    - Assert Dr Cash / Cr Accounts Receivable; invoice → Paid; A/R Aging drops it; P&L UNCHANGED.

3g. RETURNED/FAILED delivery (assign → rider returns → admin processes return):
    - Assert Dr Inventory / Cr Goods in Transit; stock restored; NO revenue, NO COGS; Goods in Transit
      nets to zero.

3h. IDEMPOTENCY: approve the same delivery twice → assert it does NOT double-post.

PHASE 4 — REPORTS TIE-OUT (after all the above)
Open and verify every report reflects the entries correctly: Trial Balance (debits = credits), Profit &
Loss (Sales − COGS), Balance Sheet (Assets = Liab + Equity; Inventory line = Inventory Valuation), A/R
Aging (unpaid deliveries), A/P Aging (vendor bill), General Ledger (rows link back to each delivery/
invoice). Confirm the warehouse invariants: GRNI = 0 after purchase cycle; Goods in Transit = 0 for all
completed deliveries; inventory never negative; revenue never recognized before delivery+approval.

PHASE 5 — FIX ANY BUG FOUND
For every ⚠️/❌ discovered above, fix it in frontend or backend (server-side is the source of truth for
stock validation, posting correctness, role/tenant isolation, idempotency). Re-run the failing step until
it passes. Do not alter the accounting engine's core to force a pass — fix the actual defect at the right
layer.

VERIFY & DELIVER:
- `npx tsc --noEmit` clean both repos; backend builds; existing acceptance tests stay green; add/extend
  tests for any bug fixed.
- DELIVERABLES: WAREHOUSE_QA_AUDIT.md with, for EACH step, the exact journal entry posted (expected vs
  actual), the report changes, and a pass ✅/fail ❌; a list of bugs found and how each was fixed; and a
  final honest statement of whether the warehouse + delivery-personnel views are production-ready, with any
  remaining gaps listed. Confirm: every delivery state posts correctly, Goods in Transit nets to zero,
  reports tie out, rider cannot post/approve, over-allocation blocked, and books balance throughout.