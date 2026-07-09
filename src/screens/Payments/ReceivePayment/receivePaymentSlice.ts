// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Slice (createAppSlice pattern)
// Manages the form state for the "Receive Customer Payment"
// flow: customer, date, method, reference, amount,
// outstanding-invoice allocations, and overpayment-as-credit
// behaviour. Also exposes the `savePayment` thunk that talks
// to the backend.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Invoice, PaymentMethod } from '../../../types';
import { getInvoicesAPI } from '../../../networks/sales/invoiceNetwork';
import { createPaymentAPI } from '../../../networks/sales/paymentNetwork';
import { invoiceListSerializer } from '../../../serializers/invoiceSerializer';

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

// ── Outstanding invoice row (used in the allocations table) ────
export interface OutstandingRow {
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  allocated: number;
  checked: boolean;
}

export interface ReceivePaymentSliceState {
  customerId: string;
  customerName: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  amount: string;
  notes: string;
  /** When true and there is leftover money, the overpayment
   *  is stored as a customer credit. When false, the user is
   *  blocked from saving until the allocations match. */
  saveOverpaymentAsCredit: boolean;
  outstandingRows: OutstandingRow[];
  allInvoices: Invoice[];
  errors: Record<string, string>;
  isSaving: boolean;
  isLoadingInvoices: boolean;
}

const initialState: ReceivePaymentSliceState = {
  customerId: '',
  customerName: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  method: 'bank_transfer',
  reference: '',
  amount: '',
  notes: '',
  saveOverpaymentAsCredit: true,
  outstandingRows: [],
  allInvoices: [],
  errors: {},
  isSaving: false,
  isLoadingInvoices: false,
};

// ── Helper: auto-distribute payment to checked rows (oldest first) ──
function autoDistribute(state: ReceivePaymentSliceState) {
  let remaining = parseFloat(state.amount) || 0;

  // Sort checked rows by due date ascending (oldest first)
  const checkedIds = new Set(
    state.outstandingRows.filter(r => r.checked).map(r => r.invoiceId),
  );

  state.outstandingRows.forEach(row => {
    if (checkedIds.has(row.invoiceId) && remaining > 0) {
      const alloc = Math.min(row.balance, remaining);
      row.allocated = Math.round(alloc * 100) / 100;
      remaining = Math.round((remaining - alloc) * 100) / 100;
    } else {
      row.allocated = 0;
    }
  });
}

// ── Helper: rebuild outstanding rows for a customer ─────
function buildOutstandingForCustomer(
  invoices: Invoice[],
  customerId: string,
): OutstandingRow[] {
  return invoices
    .filter(
      inv =>
        inv.customerId === customerId &&
        (inv.status === 'sent' ||
          inv.status === 'overdue' ||
          inv.status === 'partial') &&
        inv.total - inv.amountPaid > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate,
      total: inv.total,
      amountPaid: inv.amountPaid,
      balance: Math.round((inv.total - inv.amountPaid) * 100) / 100,
      allocated: 0,
      checked: false,
    }));
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
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
          state.errors = rest;
        }
        // Rebuild outstanding rows for the selected customer
        state.outstandingRows = buildOutstandingForCustomer(
          state.allInvoices,
          action.payload.id,
        );
      },
    ),

    toggleInvoiceCheck: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload);
        if (row) row.checked = !row.checked;
        autoDistribute(state);
      },
    ),

    setAllocatedAmount: create.reducer(
      (state, action: PayloadAction<{ invoiceId: string; amount: number }>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload.invoiceId);
        if (row) {
          row.allocated = Math.min(action.payload.amount, row.balance);
          row.checked = row.allocated > 0;
        }
      },
    ),

    payInFull: create.reducer(state => {
      const totalOutstanding = state.outstandingRows.reduce((s, r) => s + r.balance, 0);
      state.amount = String(Math.round(totalOutstanding * 100) / 100);
      state.outstandingRows.forEach(r => { r.checked = true; });
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

    preselectInvoice: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.invoiceId === action.payload);
        if (row) {
          row.checked = true;
          if (!state.amount || parseFloat(state.amount) === 0) {
            state.amount = String(row.balance);
          }
          autoDistribute(state);
        }
      },
    ),

    resetReceivePayment: create.reducer(state => {
      Object.assign(state, { ...initialState });
    }),

    // ── Async thunks ────────────────────────────────
    fetchAllInvoicesForPayment: create.asyncThunk(
      async () => {
        // Pull the largest page the API allows so a customer's open invoices
        // aren't missed by the default page size when building allocations.
        const envelope = await getInvoicesAPI({ limit: 200 });
        return invoiceListSerializer(envelope);
      },
      {
        pending: state => { state.isLoadingInvoices = true; },
        fulfilled: (state, action) => {
          const invoices = action.payload.invoices;
          state.allInvoices = invoices;
          state.isLoadingInvoices = false;

          // If customer already selected, rebuild rows
          if (state.customerId) {
            state.outstandingRows = buildOutstandingForCustomer(
              invoices,
              state.customerId,
            );
          }
        },
        rejected: state => { state.isLoadingInvoices = false; },
      },
    ),

    /**
     * Persists the payment to the backend via `POST /payments`. The
     * backend atomically applies the payment to each invoice (updating
     * `amountPaid` / `balance` / `status`), decrements the customer's AR
     * balance, and posts the double-entry journal — so the client must
     * NOT separately mutate invoices (that would double-count).
     *
     * Any portion of the payment not allocated to an invoice is retained
     * by the backend as a customer credit (negative AR balance).
     */
    savePayment: create.asyncThunk(
      async (_arg, thunkAPI) => {
        const state = thunkAPI.getState() as { receivePayment: ReceivePaymentSliceState };
        const f = state.receivePayment;

        const paymentAmount = Math.round((parseFloat(f.amount) || 0) * 100) / 100;
        const applications = f.outstandingRows
          .filter(r => r.allocated > 0)
          .map(r => ({
            invoiceId: r.invoiceId,
            amount: (Math.round(r.allocated * 100) / 100).toFixed(2),
          }));

        const created = await createPaymentAPI({
          customerId: f.customerId,
          paymentDate: f.paymentDate, // 'YYYY-MM-DD' — valid ISO date
          paymentMethod: toBackendPaymentMethod(f.method),
          amount: paymentAmount.toFixed(2),
          reference: f.reference || undefined,
          memo: f.notes || undefined,
          // Omit applications entirely for a pure prepayment/credit so the
          // backend records the whole amount as a customer credit.
          applications: applications.length > 0 ? applications : undefined,
        });

        return created;
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

export const {
  setPaymentField,
  setPaymentCustomer,
  toggleInvoiceCheck,
  setAllocatedAmount,
  payInFull,
  distributeAmount,
  toggleSaveOverpaymentAsCredit,
  setPaymentErrors,
  preselectInvoice,
  resetReceivePayment,
  fetchAllInvoicesForPayment,
  savePayment,
} = receivePaymentSlice.actions;

export const {
  selectReceivePaymentState,
  selectOutstandingRows,
  selectPaymentErrors,
  selectPaymentIsSaving,
} = receivePaymentSlice.selectors;
