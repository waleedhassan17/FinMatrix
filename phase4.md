ROLE: Act as a senior accounting-systems engineer + QA lead + qualified accountant, shipping to
production. You are working across two repos: FinMatrix (React Native + Expo, Redux Toolkit) and
FinMatrix-Backend (NestJS + TypeORM + PostgreSQL, on Heroku with Cloudinary for files).

MISSION: CHUNK 2 of 2 — complete and harden the ENTIRE ACCOUNTING CORE to QuickBooks parity and strict
accounting-principle correctness: every posting transaction, inventory + COGS, all financial reports,
and bank reconciliation. This is the most sensitive code in the system: it handles money. After this
prompt runs and its acceptance passes, the books must be provably correct, auditable, and production-ready
for real businesses.

THE PRIME DIRECTIVE (repeat after every change): total DEBITS = total CREDITS, and Assets = Liabilities +
Equity, after EVERY operation the system performs. If any change could leave the ledger unbalanced, stop
and redesign the change. Balance is never negotiable.

============================ NON-NEGOTIABLE ACCOUNTING RULES ============================
1. DOUBLE-ENTRY VIA ONE ENGINE. Every financial document posts through the single shared PostingService.
   No feature computes or writes its own ledger entries. Each entry: every line has exactly one of a
   debit or credit (non-negative); total debits === total credits (decimal equality); correct
   normal-balance sign per account type (asset/expense debit-positive; liability/equity/revenue
   credit-positive).
2. ATOMICITY. The document, its journal entry/entries, and any inventory movement are written in ONE
   database transaction (dataSource.transaction). Any failure rolls back everything — never a saved
   document without its posting, never a half-posted entry.
3. LEDGER IS THE SOURCE OF TRUTH. Every report is computed live by aggregating the general_ledger table —
   never from cached balances, never recomputed on the client. One general_ledger row per posted line,
   carrying a running balance and a link to its source document.
4. VOIDS REVERSE, NEVER DELETE. Correcting a posted document creates a dated reversing entry (and restocks
   inventory where applicable). Financial records are never hard-deleted. Full audit trail preserved.
5. MONEY IS EXACT. decimal.js + decimal columns everywhere; never JavaScript floats. One rounding rule
   (round-half-up, 2 dp for display / 4 dp storage), applied identically to tax, discounts, and
   allocations so totals never drift by a paisa.
6. PERIOD LOCK. A company closing date (booksLockedUntil) blocks any posting dated into a closed period,
   enforced centrally in the engine for every document type.
7. SERVER-ENFORCED. All validation and all tenant/role scoping live on the backend; the client is
   convenience only. companyId/role come from the JWT, never from the client.

FORBIDDEN (automatic fail): a feature that posts an unbalanced entry; any report computed from cached
balances or client-side math instead of the ledger; floats for money; hard-deleting a posted financial
record; a document saved without its journal entry; posting logic duplicated outside the PostingService;
skipping the balance check "for now". 

============================ PHASE 0 — ACCOUNTING AUDIT (produce ACCOUNTING_AUDIT.md, then STOP) ============================
Do not change code yet. For EACH document type, report whether it currently posts a correct, balanced
entry — mark ✅ correct / ⚠️ posts but wrong / ❌ missing — and give the exact debit/credit it produces vs.
what it SHOULD produce: invoice (revenue entry + COGS entry), receive payment, credit memo, bill (PO-based
and expense), pay bills, purchase order receipt, vendor credit, general journal, opening balances,
inventory adjustment, physical count, stock transfer, tax payment, payroll. Then confirm every report is
ledger-derived (trial balance, P&L, balance sheet, cash flow, A/R aging, A/P aging, inventory valuation,
general ledger). Confirm bank reconciliation does NOT exist (build it in Phase D). Note the chunk-1
delivery-approval `// CHUNK2: commit stock on approval` integration point. Output the report, propose the
phase order, and proceed only after it is complete.

============================ PHASE A — TRANSACTION POSTING CORRECTNESS ============================
Implement/verify each to EXACTLY these entries (QuickBooks-equivalent). After each, the Trial Balance must
balance.

- INVOICE (credit sale): Dr Accounts Receivable (gross); Cr Sales Revenue (net of discount); Cr Tax Payable
  (tax). PLUS a cost entry per stock line: Dr COGS; Cr Inventory (at the item's unit cost). Reduce quantity
  on hand. Service lines (no item) post NO cost. Void reverses both entries and restocks.
- RECEIVE PAYMENT: Dr Bank/Cash; Cr Accounts Receivable. Allocate across open invoices with a
  pessimistic_write row lock so concurrent payments cannot overpay; reject over-application. No P&L effect.
- BILL: PO-received stock -> Dr GRNI; Cr Accounts Payable (clears the GRNI parked at receipt — inventory is
  NOT touched again). Expense bill -> Dr expense account; Cr Accounts Payable. Input tax: if the company is
  tax-registered, Dr a recoverable Sales-Tax-Receivable asset (net tax owed = output − input); otherwise
  roll it into the expense/inventory cost. Gate this on a company "tax-registered" setting.
- PAY BILLS: Dr Accounts Payable; Cr Bank/Cash. Row-locked like payments. No P&L effect.
- CREDIT MEMO: mirror of an invoice — Dr Sales Revenue + Dr Tax Payable; Cr Accounts Receivable; if goods
  returned, Dr Inventory / Cr COGS and restock. Apply-to-invoice or cash refund.
- VENDOR CREDIT: mirror on the payable side — reduce Accounts Payable; apply to an open bill.
- GENERAL JOURNAL: arbitrary balanced lines; refuses to post unless debits = credits; drafts post nothing;
  void creates a reversing entry.
- OPENING BALANCES: offset to Opening Balance Equity in the same transaction so the Trial Balance starts
  balanced.
- Fix the journal-reference generation race (use a lockable per-company counter or unique-constraint +
  retry) so references are unique under concurrency.

ACCEPTANCE A: each document posts exactly the entries above, atomically; voids reverse + restock; no overpay
under concurrent load; unique references under concurrency; Trial Balance balances after every scenario.

============================ PHASE B — INVENTORY + COGS (belongs here, not chunk 1) ============================
- Finalize the chunk-1 delivery-approval integration point: on admin approval, commit the stock movement
  (and any required posting) atomically.
- PO receipt: Dr Inventory; Cr GRNI (stock rises exactly ONCE per purchased unit).
- Inventory adjustment: write-down -> Dr Inventory Adjustment; Cr Inventory (write-up reverses). Physical
  count posts the variance as an adjustment so book qty = counted qty.
- Stock transfer: quantity moves between locations with NO P&L impact (asset-to-asset).
- COGS uses a single documented cost method (weighted-average or FIFO) applied consistently on every sale.

ACCEPTANCE B: inventory rises exactly once on purchase (PO→receipt→bill: GRNI nets to 0); adjustments post
correctly; transfers post no P&L; Inventory Valuation total = Balance Sheet Inventory line; Trial Balance
balances.

============================ PHASE C — REPORTS (ledger-derived) + INVARIANTS ============================
Ensure Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, A/R Aging, A/P Aging, Inventory Valuation,
and General Ledger each compute by aggregating general_ledger rows (server-side). Enforce and TEST these
invariants:
- Trial Balance: total debits = total credits.
- Balance Sheet: Assets = Liabilities + Equity.
- Balance Sheet Inventory = Inventory Valuation total.
- Balance Sheet Accounts Receivable = sum of open invoices = A/R Aging total.
- Balance Sheet Accounts Payable = sum of open bills = A/P Aging total.
- Period net profit (P&L) rolls into equity so the Balance Sheet balances.
ACCEPTANCE C: run the full end-to-end worked example; all reports tie out and every invariant holds.

============================ PHASE D — BANK RECONCILIATION (the missing QuickBooks feature — BUILD IT) ============================
- Backend: `reconciliations` table + a `reconciled/cleared` flag on bank general_ledger rows; endpoints to
  start a reconciliation (select bank account + statement ending balance + date), list unreconciled entries,
  mark entries cleared, and finalize. IMPORTANT: reconciliation posts NO journal entries — it only marks
  existing rows. It can only be finalized when (statement balance − cleared book balance) = 0, at which
  point the cleared rows are stamped reconciled and the reconciliation is locked. Corrections (e.g. a bank
  charge the books lack) are entered as normal transactions, which then appear as ledger rows to reconcile.
- Frontend: select account -> enter statement balance/date -> tick cleared entries -> live difference that
  must reach 0 -> finalize (stamps reconciled, locks). Loading/empty/error states.
ACCEPTANCE D: ticking cleared items drives the difference to 0; finalize stamps reconciled + locks; a
reconciled period cannot be silently altered; it creates no journal entries.

============================ PHASE E — HARDENING & FULL VERIFICATION ============================
- Idempotency keys on all create/post endpoints (a retried request cannot double-post).
- Atomic account-balance updates (or recompute from the ledger); confirm reports rely on the ledger, not
  the cached balance.
- Server-side validation parity with the client on every posting endpoint.
- Expand test/acceptance.ts to cover EVERY scenario above AND: opening-balance offset, invoice+COGS,
  full/partial payment, void+restock, PO→receive→bill (GRNI nets to 0), expense bill, input-tax net,
  credit/vendor credit, adjustment/count/transfer, tax payment, payroll, bank reconciliation to zero,
  idempotency (no double post), period lock (back-dated posting rejected), tenant isolation, role
  enforcement, concurrency (no overpay, unique references), and a long taxed/discounted/split chain that
  leaves the Trial Balance off by EXACTLY 0. All green in CI against a real Postgres.

ACCEPTANCE — DEFINITION OF DONE (all must pass):
- [ ] Every document posts balanced, atomic, correct-sign entries; voids reverse + restock.
- [ ] Inventory + COGS correct; Inventory Valuation = Balance Sheet Inventory.
- [ ] Every report is ledger-derived; all cross-report invariants hold.
- [ ] Bank reconciliation works end to end (difference → 0, finalize, lock; posts nothing).
- [ ] Concurrency-safe (no overpay, no duplicate references); money exact to the paisa.
- [ ] Idempotent posting; period lock enforced; tenant + role isolation proven by tests.
- [ ] Full acceptance suite green in CI; Trial Balance AND Balance Sheet balance after EVERY scenario.
- [ ] `npx tsc --noEmit` clean in both repos; backend `npm run build` succeeds.

DELIVERABLES: ACCOUNTING_AUDIT.md; small reviewable commits per phase; the expanded acceptance suite; and a
filled-in ACCOUNTING SIGN-OFF SHEET listing, for each document type, the exact debit/credit it produces and
a ✅ that its scenario left the Trial Balance balanced. Confirm explicitly: books balance across all
scenarios, reports are ledger-derived, and no accounting rule in the "non-negotiable" list was violated. 


Honest caveat: a strong prompt raises the floor dramatically, but it does not guarantee the output is flawless — accounting correctness ultimately needs your verification. After it runs, personally check three things against the Sign-Off Sheet: issue one invoice and confirm all five accounts move correctly and the Trial Balance still balances; run a PO→receive→bill and confirm GRNI nets to zero; and run the full worked example and confirm the P&L profit equals the equity movement on the Balance Sheet. Those three checks catch the vast majority of what could be wrong.