# BANK RECONCILIATION — QA AUDIT & PRODUCTION-READINESS REPORT

Role: senior QA engineer + accountant. Scope: `FinMatrix` (React Native + Expo) and
`FinMatrix-Backend` (NestJS + TypeORM + PostgreSQL). Target: QuickBooks bank-reconciliation
behavior, per `bankreconcillation.md`.

Feature surface audited:
- Backend: `src/modules/reconciliations/` (controller, service, entity, DTOs),
  `src/modules/ledger/entities/general-ledger.entity.ts` (`cleared`, `reconciliation_id`),
  migration `1783200000000-BankReconciliation.ts`, mutation paths in payments /
  journal-entries / invoices / bills / credit-memos / payroll.
- Frontend: `src/screens/BankReconciliation/{List,Detail,BankReconciliation}Screen.tsx`,
  `models/reconciliationModel.ts`, `networks/accounting/reconciliationNetwork.ts`,
  `serializers/reconciliationSerializer.ts`.

## PHASE 0 — Audit: the 11 QuickBooks behaviors (initial state)

| # | Behavior | Verdict | Evidence (file:line at audit time) |
|---|----------|---------|------------------------------------|
| 1 | Select bank/cash account → statement ending balance + date | ✅ | List screen picks Cash/Bank accounts (`BankReconciliationListScreen.tsx:59-80`, backend filter `reconciliations.service.ts:25,53`); reconcile screen has `DateField` + balance input (`BankReconciliationScreen.tsx:102-108`) |
| 2 | Beginning balance auto-rolls from prior reconciliation | ✅ | Derived, never typed: net of all reconciled GL rows (`reconciliations.service.ts:66-78`); equals last statement ending by construction, with a mismatch WARNING if reconciled history was altered out-of-band (`:137-158`, FE banner `BankReconciliationScreen.tsx:119-128`) |
| 3 | Uncleared txns with cleared checkbox, split payments vs deposits, running totals/counts | ⚠️ | Checkboxes + one combined list + single count (`BankReconciliationScreen.tsx:152-171`); NOT split into Payments/withdrawals vs Deposits with per-section cleared totals and counts |
| 4 | Live cleared balance + difference = statement − cleared book | ✅ | `useMemo` recompute on every tick (`BankReconciliationScreen.tsx:67-73`); same formula server-side (`reconciliations.service.ts:280-286`) |
| 5 | Finish ONLY at difference = 0.00 | ✅ | FE disables Finish (`:75`), backend hard-blocks `RECONCILIATION_OUT_OF_BALANCE` (`reconciliations.service.ts:288-293`) — server is authoritative |
| 6 | Reconciliation posts NO journal entries | ✅ | `create()` only stamps `cleared`/`reconciliation_id` on GL rows (`reconciliations.service.ts:311-316`); the module has no PostingService dependency at all. Statement-only items (bank fee) enter as normal transactions and appear in the list. Proven by test: Trial Balance identical to the rupee before/after finish |
| 7 | Finish → stamp + LOCK, report (cleared/outstanding/balances), ending → next beginning | ⚠️→✅ | Stamp ✅ (`:311-316`); report ✅ incl. outstanding carried forward (`getById`, `:196-219`); roll ✅ (derived beginning). **LOCK was missing** — see #9 |
| 8 | Uncleared txns carry forward as outstanding | ✅ | Untouched rows stay `reconciliation_id NULL`, reappear next session (`:109-118`); shown as Outstanding in the report (`:200-217`) |
| 9 | Reconciled txn must not be silently altered; warn/block edit+void; admin-only audited undo | ❌→✅ | **BUG (fixed):** `journal-entries.service.void` and `payments.service.delete` had NO reconciled check — a reconciled bank row's source doc could be voided/deleted silently. FIXED: both now throw `TRANSACTION_RECONCILED` when any of the doc's GL rows are reconciled (shared `assertNotReconciled`, `reconciliations.util.ts`). Undo was already correct: admin-only (`reconciliations.controller.ts:81-89`), latest-only (`service:340-358`), audit-logged `reconciliation_undone` (`:364-376`). Other paths verified safe: invoices/bills never post to Cash/Bank; processed payroll runs can't be deleted (`payroll.service.ts:246`); refunded credit memos can't be voided (`credit-memos.service.ts:118`); accounts with GL history can't be deleted |
| 10 | History of past reconciliations with reports | ✅ | `GET /reconciliations` + `GET /reconciliations/:id` (cleared + outstanding + balances); FE List "History" section + Detail report screen |
| 11 | Save-and-resume retains cleared marks | ❌→✅ | **BUG (fixed):** cleared ticks lived only in component state (`useState<Set>`), lost on exit. FIXED: ticks now persist server-side per row (`PATCH /reconciliations/mark` sets `general_ledger.cleared` on unreconciled rows; `GET /reconciliations/unreconciled` returns the flag; screen seeds from it and saves each toggle). Statement date/balance also restored per-account (FE AsyncStorage draft) |

Specific Phase-0 questions:
- (a) **Posts any JE during reconciliation?** NO — verified by code (no posting dependency) and by test (TB byte-identical before/after finish).
- (b) **Difference computed correctly?** YES — `statement ending − (beginning + Σ cleared (debit−credit))`, FE and BE agree; money math via decimal utils, 0.0001 tolerance.
- (c) **Can it finish with non-zero difference?** NO — FE disables and the backend 400s (tested: off-by-500 finish → `RECONCILIATION_OUT_OF_BALANCE`).
- (d) **Beginning balance rolls?** YES — derived from reconciled rows; equals prior statement ending; tested across two consecutive reconciliations.
- (e) **Reconciled items locked?** WAS NO (bug) → now YES: void/delete of any doc with reconciled GL rows is blocked with `TRANSACTION_RECONCILED`; only path back is the admin undo.
- (f) **History + admin undo?** YES — history with full reports; undo is `@Roles('admin')`, latest-reconciliation-only, restores rows, and writes an operational-audit record.

## Bugs found & fixed (Phase 1)

**Backend**
1. **No reconciled lock (behavior 9)** — `payments.delete` and `journal-entries.void` could alter
   docs whose bank rows were reconciled. Fix: `src/modules/reconciliations/reconciliations.util.ts`
   `assertNotReconciled(manager, companyId, {journalEntryIds|sourceIds})` → 400
   `TRANSACTION_RECONCILED` ("…undo that reconciliation first (admin)"), wired into both paths.
2. **No save/resume (behavior 11)** — added `PATCH /reconciliations/mark`
   (`{accountId, marks:[{entryId, cleared}]}`): flips `general_ledger.cleared` for UNRECONCILED
   rows of that Cash/Bank account only; finalized rows are untouchable. `getUnreconciled` now
   returns `cleared` per row. Finishing still takes the explicit `clearedEntryIds` from the client.
3. `payments.delete` was a silent no-op (`softRemove` with no `@DeleteDateColumn`) that left the
   payment's JE/GL and invoice applications in place even if it had worked. Now: reconciled guard,
   then posts a REVERSING entry (Dr AR / Cr Bank), rolls back invoice `amountPaid`/status and
   customer balance, and hard-deletes the payment row — books stay balanced (TB re-verified).

**Frontend**
4. **Legacy plan-style combined list (behavior 3)** — reconcile screen now renders two sections,
   "Payments & withdrawals" and "Deposits", each with its own cleared count and running total,
   plus overall cleared balance / difference tiles.
5. **Save/resume wiring (behavior 11)** — screen seeds ticks from the server's `cleared` flags,
   persists every toggle (debounced batch PATCH), and restores statement date/balance drafts
   per account from AsyncStorage.
6. **Web-dead dialogs** — Finish success, load errors, and the Undo confirmation used
   `Alert.alert` button callbacks, which are NO-OPs on react-native-web (project rule: confirms
   must be Modals; plain alerts need a web fallback). Undo now uses a real Modal; outcome/error
   messages use toasts.

## PHASE 2 — Test with real posted entries (expected vs actual)

Method: fresh throwaway Postgres DB (docker), real server boot, everything through the public
API as a company admin — `test/bankrec.acceptance.ts` (`npm run test:bankrec`). Every step
asserts Trial Balance Dr=Cr and Balance Sheet A=L+E.

| Step | Expected | Actual |
|------|----------|--------|
| Post opening + 4 bank txns (2 deposits, 2 payments) | TB/BS balanced | ✅ |
| Start rec, statement covers 3 of 4 txns; tick them | difference → 0.00 | ✅ |
| Finish at 0.00 | 201; rows stamped `reconciliationId`, report generated | ✅ |
| TB before vs after finish | IDENTICAL to the rupee | ✅ byte-identical totals |
| Finish with non-zero difference | blocked | ✅ 400 `RECONCILIATION_OUT_OF_BALANCE` |
| Statement has Rs 500 bank fee books lack | add normal JE (Dr Bank Charges / Cr Bank) → appears in list → tick → 0.00 | ✅ fee posted by the JE endpoint, NOT by reconciliation |
| Unticked txn | appears as Outstanding in report; carries into next session | ✅ |
| Void reconciled JE / delete reconciled payment | blocked | ✅ 400 `TRANSACTION_RECONCILED` |
| Admin undo latest reconciliation | rows restored, audit-logged; older rec undo blocked | ✅ (`RECONCILIATION_NOT_LATEST` for older) |
| Exit mid-rec (marks saved), reload unreconciled | cleared marks retained | ✅ `cleared:true` returned |
| Second statement | beginning = first statement's ending | ✅ |
| Non-bank account rec / cleared entry dated after statement | rejected | ✅ `NOT_RECONCILABLE` / `CLEARED_ENTRY_AFTER_STATEMENT` |

## PHASE 3 — Delivery status

- `npx tsc --noEmit`: clean in BOTH repos. Backend `nest build`: clean. Frontend `expo export`: bundles.
- Backend jest suite: green (includes new `reconciliations.util.spec.ts`).
- Acceptance: `npm run test:bankrec` — all steps above pass against a real server + DB.

**Production-ready statement** — the feature now matches the QuickBooks flow for all 11
behaviors. Honest remaining gaps:
1. The reconciled-transaction lock covers every mutation route that can touch Cash/Bank GL rows
   today (payment delete, manual-JE void). It is enforced in those services, not centrally in
   the posting engine — a FUTURE endpoint that deletes/edits bank-posting docs must call
   `assertNotReconciled` too.
2. Statement date/ending-balance drafts are per-device (AsyncStorage); the cleared TICKS are
   server-side. Two users reconciling the same account simultaneously will share tick state by
   design (QB behaves the same) but each sees their own statement header draft.
3. No PDF export of the reconciliation report (in-app report only).
4. `beginningMismatch` warns when reconciled history was altered outside the app (e.g. direct
   DB edit); with the new locks this should never occur through the API.
