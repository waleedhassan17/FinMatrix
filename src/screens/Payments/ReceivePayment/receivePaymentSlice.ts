// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Slice (createAppSlice pattern)
// Manages the form state for the "Receive Customer Payment"
// flow: customer, date, method, reference, amount,
// outstanding-invoice allocations, credit on account, and
// overpayment-as-advance behaviour. Also exposes the
// `savePayment` thunk that talks to the backend.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { PaymentMethod } from '../../../types';
import {
  createPaymentAPI,
  getOutstandingInvoicesAPI,
  settleInvoicesAPI,
  type CustomerCreditUsePayload,
} from '../../../networks/sales/paymentNetwork';
import { getARPartySummaryAPI } from '../../../networks/reports/arAgingNetwork';
import { partySummarySerializer } from '../../../serializers/partySummarySerializer';
import { toUiPaymentMethod } from '../../../serializers/paymentSerializer';
import { toIsoDate } from '../../../models/reportModel';
import {
  creditSourcesFromSummary,
  spreadCredits,
  type CreditSource,
  type CreditSpread,
} from '../../../models/creditSpreadModel';

/**
 * The UI's payment-method vocabulary differs from the backend's. Map the
 * client values onto the values accepted by the API's ReceivePaymentDto
 * (`cash | check | bank_transfer | credit_card | other`).
 */
function toBackendPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'cheque':
      return 'check';
    case 'online':
      return 'other';
    case 'cash':
    case 'bank_transfer':
      return method;
    default:
      return 'other';
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Outstanding invoice row (used in the allocations table) ────
export interface OutstandingRow {
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  /** New money applied to this invoice. */
  allocated: number;
  /** Credit on account landing on this invoice — derived, never typed. */
  credit: number;
  checked: boolean;
}

export interface ReceivePaymentSliceState {
  customerId: string;
  customerName: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  /** New money received. May be empty when credit on account settles it all. */
  amount: string;
  notes: string;
  /** When true, money not applied to an invoice is held as a customer
   *  advance (Customer Advances, a liability) to apply later. When false,
   *  the user is blocked from saving until the allocations match. */
  saveOverpaymentAsCredit: boolean;
  /** The customer's open invoices, oldest due first — as the server orders them. */
  outstandingRows: OutstandingRow[];
  /** Advances and open credit memos the customer holds. */
  credits: CreditSource[];
  /** Off until asked for, as on the web: a plain receipt never quietly spends
   *  an advance the user did not mean to. "Use credit" on an invoice turns it on. */
  useCredits: boolean;
  /** Settled first by credit — the invoice "Use credit" was pressed on. */
  priorityInvoiceId: string;
  /**
   * Opened from the outstanding summary: every open invoice is ticked when the
   * rows arrive, so a typed amount is spread across them oldest first.
   */
  tickAll: boolean;
  /** Reviewing a staff settlement: the credit it asks to spend, as asked. */
  requestCredits: CustomerCreditUsePayload[];
  errors: Record<string, string>;
  isSaving: boolean;
  isLoadingInvoices: boolean;
}

const initialState: ReceivePaymentSliceState = {
  customerId: '',
  customerName: '',
  // Local calendar date: toISOString() is UTC and reads yesterday in PKT
  // before 05:00. Refreshed again on reset, since initialState is evaluated
  // once at bundle load.
  paymentDate: toIsoDate(new Date()),
  method: 'bank_transfer',
  reference: '',
  amount: '',
  notes: '',
  saveOverpaymentAsCredit: true,
  outstandingRows: [],
  credits: [],
  useCredits: false,
  priorityInvoiceId: '',
  tickAll: false,
  requestCredits: [],
  errors: {},
  isSaving: false,
  isLoadingInvoices: false,
};

/** What is left on a row for new money once credit has taken its part. */
export const cashCapOf = (row: OutstandingRow): number => Math.max(0, round2(row.balance - row.credit));

/**
 * Where the credit goes: every open invoice, oldest due first — except that
 * the invoice "Use credit" was pressed on goes first in line. The same order
 * the web app spreads it in.
 */
export function creditSpreadOf(
  state: Pick<ReceivePaymentSliceState, 'outstandingRows' | 'credits' | 'useCredits' | 'priorityInvoiceId'>,
): CreditSpread {
  const targets = state.outstandingRows.map(r => ({ documentId: r.invoiceId, cap: r.balance }));
  const first = targets.findIndex(t => t.documentId === state.priorityInvoiceId);
  const ordered = first > 0 ? [targets[first], ...targets.filter((_, i) => i !== first)] : targets;
  return spreadCredits(ordered, state.useCredits ? state.credits : []);
}

// ── Helper: auto-distribute the new money to checked rows (oldest first) ──
// Each row takes no more than credit left of it, so cash never overlaps credit.
function autoDistribute(state: ReceivePaymentSliceState) {
  let remaining = parseFloat(state.amount) || 0;
  state.outstandingRows.forEach(row => {
    if (row.checked && remaining > 0) {
      const alloc = Math.min(cashCapOf(row), remaining);
      row.allocated = round2(alloc);
      remaining = round2(remaining - alloc);
    } else {
      row.allocated = 0;
    }
  });
}

/**
 * Put the credit on the rows, then re-spread the cash over what it left. A row
 * credit settles in full takes no cash at all. Run after anything that changes
 * what credit covers: the switch, a credit's amount, the rows or credits arriving.
 */
function recompute(state: ReceivePaymentSliceState) {
  const spread = creditSpreadOf(state);
  state.outstandingRows.forEach(row => {
    row.credit = spread.perDocument[row.invoiceId] ?? 0;
    if (cashCapOf(row) <= 0) row.checked = false;
  });
  autoDistribute(state);
}

/** `GET /payments/customer/:id/outstanding` → rows. */
export function outstandingRowsOf(payload: any): OutstandingRow[] {
  const list: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return list
    .map(inv => {
      const total = Number(inv?.total) || 0;
      const amountPaid = Number(inv?.amountPaid) || 0;
      const balance = inv?.balance !== undefined ? Number(inv.balance) || 0 : total - amountPaid;
      return {
        invoiceId: String(inv?.id ?? ''),
        invoiceNumber: String(inv?.invoiceNumber ?? ''),
        dueDate: String(inv?.dueDate ?? ''),
        total,
        amountPaid,
        balance: round2(balance),
        allocated: 0,
        credit: 0,
        checked: false,
      };
    })
    .filter(r => r.invoiceId && r.balance > 0);
}

export const receivePaymentSlice = createAppSlice({
  name: 'receivePayment',
  initialState,
  reducers: create => ({
    setPaymentField: create.reducer(
      (state, action: PayloadAction<{ key: keyof ReceivePaymentSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),

    setPaymentCustomer: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        const changed = state.customerId !== action.payload.id;
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
          state.errors = rest;
        }
        // The screen fetches this customer's invoices and credits next.
        if (changed) {
          state.outstandingRows = [];
          state.credits = [];
        }
      },
    ),

    /** Where the screen was opened from: "Use credit" on an invoice turns
     *  credit on and puts that invoice first in line. */
    openForCredit: create.reducer(
      (state, action: PayloadAction<{ invoiceId?: string }>) => {
        state.useCredits = true;
        state.priorityInvoiceId = action.payload.invoiceId ?? '';
        recompute(state);
      },
    ),

    /**
     * Opened from the outstanding summary ("Receive Payment" there): the
     * summary's total is what is due after credits, so credit is switched on
     * and every open invoice is ticked once the rows arrive. Every amount
     * stays editable.
     */
    openForSummary: create.reducer(state => {
      state.useCredits = true;
      state.tickAll = true;
      state.outstandingRows.forEach(r => { r.checked = true; });
      recompute(state);
    }),

    setUseCredits: create.reducer((state, action: PayloadAction<boolean>) => {
      state.useCredits = action.payload;
      if (state.errors.credits) {
        const { credits: _, ...rest } = state.errors;
        state.errors = rest;
      }
      recompute(state);
    }),

    /** How much of one credit to spend, as typed. */
    setCreditUse: create.reducer(
      (state, action: PayloadAction<{ id: string; value: string }>) => {
        const credit = state.credits.find(c => c.id === action.payload.id);
        if (!credit) return;
        credit.use = action.payload.value.replace(/[^0-9.]/g, '');
        recompute(state);
      },
    ),

    toggleInvoiceCheck: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload);
        // Credit already settles it: there is nothing left for cash to take.
        if (row && cashCapOf(row) > 0) row.checked = !row.checked;
        autoDistribute(state);
      },
    ),

    /**
     * An amount typed on one invoice: two in full, the third in part. Capped at
     * what the invoice still owes after credit. The row stays ticked while it is
     * edited — clearing the box to retype must not take the box away — and a
     * row at zero is simply left out of what is sent.
     */
    setAllocatedAmount: create.reducer(
      (state, action: PayloadAction<{ invoiceId: string; amount: number }>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload.invoiceId);
        if (row) {
          row.allocated = round2(Math.max(0, Math.min(action.payload.amount, cashCapOf(row))));
          row.checked = true;
        }
      },
    ),

    /** Receive what is still owed once credit has taken its part. */
    payInFull: create.reducer(state => {
      const owed = state.outstandingRows.reduce((s, r) => s + cashCapOf(r), 0);
      state.amount = String(round2(owed));
      state.outstandingRows.forEach(r => { r.checked = cashCapOf(r) > 0; });
      autoDistribute(state);
    }),

    distributeAmount: create.reducer(state => {
      autoDistribute(state);
    }),

    toggleSaveOverpaymentAsCredit: create.reducer(state => {
      state.saveOverpaymentAsCredit = !state.saveOverpaymentAsCredit;
    }),

    setPaymentErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),

    /**
     * Tick the invoice the screen was opened for. With no credit in play the
     * amount is seeded with what it owes; with credit, it is not — credit is
     * what settles it, and any new money is the user's to enter.
     */
    preselectInvoice: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload);
        if (row && cashCapOf(row) > 0) {
          row.checked = true;
          if (!state.useCredits && (!state.amount || parseFloat(state.amount) === 0)) {
            state.amount = String(cashCapOf(row));
          }
          autoDistribute(state);
        }
      },
    ),

    /**
     * Load a staff approval request back into the form so the owner can see the
     * figures they are approving. Phase one: everything that does not depend on
     * the invoice rows.
     *
     * Inverts what savePayment builds. Two renames to watch — the payload's
     * `memo` is the form's `notes`, and `paymentMethod` carries the API's
     * vocabulary, not the form's. Optional keys are OMITTED by the builder
     * rather than blanked, so nothing here may assume a field is present; the
     * auto-generated reference in particular has to be overwritten, not
     * defaulted around.
     *
     * Three shapes arrive here: a receipt (the fields at the top level), a
     * settlement (`action: 'settle'` — credit in `credits`, new money in
     * `cash`), and applying an advance a receipt already holds
     * (`action: 'apply'` — credit only, no new money).
     *
     * The customer name is passed in: the payload stores an id, and a review
     * screen showing a bare uuid where the customer should be is not a review.
     */
    loadFromRequestPayload: create.reducer(
      (
        state,
        action: PayloadAction<{ payload: Record<string, any>; customerName: string }>,
      ) => {
        const { payload, customerName } = action.payload;
        const action_ = String(payload.action ?? '');
        const cash: Record<string, any> =
          action_ === 'settle' ? (payload.cash ?? {}) : action_ === 'apply' ? {} : payload;
        state.customerId = payload.customerId ?? '';
        state.customerName = customerName;
        state.paymentDate = String(payload.paymentDate ?? payload.date ?? '').slice(0, 10);
        state.method = toUiPaymentMethod(String(cash.paymentMethod ?? ''));
        state.amount = String(cash.amount ?? '');
        state.reference = cash.reference ?? '';
        state.notes = cash.memo ?? '';
        state.errors = {};
        state.useCredits = false;
        state.requestCredits = requestCreditsOf(payload);
      },
    ),

    /**
     * Phase two: put the request's allocations onto the rows, once they exist.
     *
     * Separate from the load above because the rows arrive by their own
     * request, and building them sets every allocation to zero — so
     * allocations set before they arrive are wiped. The screen chains this off
     * outstandingRows appearing, the same way preselectInvoice does.
     *
     * Deliberately does NOT call autoDistribute: this is a replay of a split
     * somebody already chose, and autoDistribute would redistribute it
     * oldest-first and zero every row it considers unchecked.
     */
    applyRequestAllocations: create.reducer(
      (state, action: PayloadAction<Array<{ invoiceId?: string; amount?: string }>>) => {
        for (const app of action.payload) {
          if (!app?.invoiceId) continue;
          const row = state.outstandingRows.find(r => r.invoiceId === app.invoiceId);
          // A row can legitimately be missing — the invoice may have been paid
          // another way since. The amount above still tells the owner what
          // they are approving.
          if (!row) continue;
          const amount = parseFloat(String(app.amount ?? '')) || 0;
          row.allocated = Math.min(amount, row.balance);
          row.checked = row.allocated > 0;
        }
      },
    ),

    resetReceivePayment: create.reducer(state => {
      Object.assign(state, { ...initialState, paymentDate: toIsoDate(new Date()) });
    }),

    // ── Async thunks ────────────────────────────────
    /**
     * The customer's open invoices, from the server — every one, oldest due
     * first, the order the settlement sweeps in. (This used to filter the
     * company's latest 200 invoices on the phone, so a busy company's older
     * invoices simply were not offered.)
     */
    fetchOutstandingForPayment: create.asyncThunk(
      async (customerId: string) => outstandingRowsOf(await getOutstandingInvoicesAPI(customerId)),
      {
        pending: state => { state.isLoadingInvoices = true; },
        fulfilled: (state, action) => {
          // A late answer for a customer no longer selected is dropped.
          if (action.meta.arg !== state.customerId) return;
          state.isLoadingInvoices = false;
          state.outstandingRows = action.payload;
          if (state.tickAll) state.outstandingRows.forEach(r => { r.checked = true; });
          recompute(state);
        },
        rejected: (state, action) => {
          if (action.meta.arg === state.customerId) state.isLoadingInvoices = false;
        },
      },
    ),

    /**
     * Advances and open credit memos — from the customer summary, the figures
     * the web's Receive Payment reads. A failed lookup offers no credit; it
     * never blocks recording a payment.
     */
    fetchCreditsForPayment: create.asyncThunk(
      async (customerId: string) => {
        const summary = partySummarySerializer(await getARPartySummaryAPI(customerId));
        return creditSourcesFromSummary(summary?.credits.items ?? [], 'customer');
      },
      {
        fulfilled: (state, action) => {
          if (action.meta.arg !== state.customerId) return;
          state.credits = action.payload;
          recompute(state);
        },
        rejected: (state, action) => {
          if (action.meta.arg === state.customerId) state.credits = [];
        },
      },
    ),

    /**
     * Records it.
     *
     * With credit in use: ONE `POST /payments/settle` the server runs as one
     * transaction — credit first, then the receipt — so a refused receipt
     * leaves the credit exactly where it was. With none: the plain
     * `POST /payments` it has always been. Either way the server applies the
     * money to each invoice and posts the journal, so the client must NOT
     * separately mutate invoices (that would double-count).
     *
     * Any new money not applied to an invoice is held by the backend as a
     * customer advance (Cr Customer Advances).
     *
     * `idempotencyKey` is held by the screen across retries of this one
     * attempt, so a retry after a lost response replays instead of banking the
     * money twice.
     */
    savePayment: create.asyncThunk(
      async (arg: { idempotencyKey?: string } | void, thunkAPI) => {
        const idempotencyKey = arg ? arg.idempotencyKey : undefined;
        const state = thunkAPI.getState() as { receivePayment: ReceivePaymentSliceState };
        const f = state.receivePayment;

        const paymentAmount = round2(parseFloat(f.amount) || 0);
        const applications = f.outstandingRows
          .filter(r => r.allocated > 0)
          .map(r => ({
            invoiceId: r.invoiceId,
            amount: round2(r.allocated).toFixed(2),
          }));
        const cash = {
          paymentMethod: toBackendPaymentMethod(f.method),
          amount: paymentAmount.toFixed(2),
          reference: f.reference || undefined,
          memo: f.notes || undefined,
          applications: applications.length > 0 ? applications : undefined,
          // With no applications the server AUTO-APPLIES oldest-first, so
          // omitting them alone did the opposite of "save as customer credit".
          // holdAsAdvance keeps the whole receipt as an advance.
          ...(applications.length === 0 ? { holdAsAdvance: true } : {}),
        };

        const credits: CustomerCreditUsePayload[] = creditSpreadOf(f)
          .pieces.filter(p => p.amount > 0)
          .map(p => ({
            kind: p.kind === 'credit_memo' ? 'credit_memo' : 'advance',
            id: p.creditId,
            invoiceId: p.documentId,
            amount: p.amount.toFixed(2),
          }));

        const response =
          credits.length > 0
            ? await settleInvoicesAPI(
                {
                  customerId: f.customerId,
                  paymentDate: f.paymentDate,
                  credits,
                  // No new money, no receipt: a zero cash leg would be refused.
                  ...(paymentAmount > 0 ? { cash } : {}),
                },
                idempotencyKey,
              )
            : await createPaymentAPI(
                { customerId: f.customerId, paymentDate: f.paymentDate, ...cash },
                idempotencyKey,
              );

        // Staff get an approval request back, not a payment. Read the flag off
        // the raw envelope and check BOTH positions: the network layer returns
        // response.data un-unwrapped, so it may sit at either depth, and
        // `(created?.data ?? created)?.pending` is NOT the same test — ?? picks
        // whichever operand is merely present, so a truthy `data` wins and its
        // missing `.pending` reads undefined.
        if (response?.data?.pending ?? response?.pending) {
          return { payment: null, pending: true };
        }
        if (credits.length > 0) {
          const settled = response?.data ?? response;
          return { payment: settled?.payment ?? null, pending: false };
        }
        return { payment: response, pending: false };
      },
      {
        pending: state => {
          state.isSaving = true;
          state.errors = {};
        },
        fulfilled: state => {
          state.isSaving = false;
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.errors = {
            _root: action.error?.message ?? 'Failed to record payment',
          };
        },
      },
    ),
  }),

  selectors: {
    selectReceivePaymentState: state => state,
    selectOutstandingRows: state => state.outstandingRows,
    selectPaymentErrors: state => state.errors,
    selectPaymentIsSaving: state => state.isSaving,
  },
});

/** The credit a staff request asks to spend, whichever shape it came in. */
export function requestCreditsOf(payload: Record<string, any>): CustomerCreditUsePayload[] {
  const action = String(payload?.action ?? '');
  if (action === 'settle' && Array.isArray(payload.credits)) {
    return payload.credits
      .filter((c: any) => c?.invoiceId && c?.id)
      .map((c: any) => ({
        kind: c.kind === 'credit_memo' ? 'credit_memo' : 'advance',
        id: String(c.id),
        invoiceId: String(c.invoiceId),
        amount: String(c.amount ?? '0'),
      }));
  }
  // Applying an advance a receipt holds: every application is credit.
  if (action === 'apply' && Array.isArray(payload.applications)) {
    return payload.applications
      .filter((a: any) => a?.invoiceId)
      .map((a: any) => ({
        kind: 'advance' as const,
        id: String(payload.paymentId ?? ''),
        invoiceId: String(a.invoiceId),
        amount: String(a.amount ?? '0'),
      }));
  }
  return [];
}

/** The new money's allocations in a staff request, whichever shape it came in. */
export function requestCashApplicationsOf(
  payload: Record<string, any>,
): Array<{ invoiceId?: string; amount?: string }> | null {
  const action = String(payload?.action ?? '');
  if (action === 'apply') return null;
  const source = action === 'settle' ? payload.cash : payload;
  return Array.isArray(source?.applications) ? source.applications : null;
}

export const {
  openForSummary,
  setPaymentField,
  setPaymentCustomer,
  openForCredit,
  setUseCredits,
  setCreditUse,
  toggleInvoiceCheck,
  setAllocatedAmount,
  payInFull,
  distributeAmount,
  toggleSaveOverpaymentAsCredit,
  setPaymentErrors,
  preselectInvoice,
  loadFromRequestPayload,
  applyRequestAllocations,
  resetReceivePayment,
  fetchOutstandingForPayment,
  fetchCreditsForPayment,
  savePayment,
} = receivePaymentSlice.actions;

export const {
  selectReceivePaymentState,
  selectOutstandingRows,
  selectPaymentErrors,
  selectPaymentIsSaving,
} = receivePaymentSlice.selectors;
