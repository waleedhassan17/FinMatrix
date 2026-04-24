// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Slice (createAppSlice pattern)
// Manages form state: customer, date, method, amount,
// outstanding invoice checkboxes, and auto-distribute.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Invoice, PaymentMethod } from '../../../types';
import { getInvoicesAPI } from '../../../network/invoiceNetwork';
import { invoiceListSerializer } from '../../../serializers/invoiceSerializer';

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
        const custInvoices = state.allInvoices
          .filter(
            inv =>
              inv.customerId === action.payload.id &&
              (inv.status === 'sent' || inv.status === 'overdue') &&
              inv.total - inv.amountPaid > 0,
          )
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        state.outstandingRows = custInvoices.map(inv => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          dueDate: inv.dueDate,
          total: inv.total,
          amountPaid: inv.amountPaid,
          balance: Math.round((inv.total - inv.amountPaid) * 100) / 100,
          allocated: 0,
          checked: false,
        }));
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

    setPaymentErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),

    setPaymentIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
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
        const envelope = await getInvoicesAPI();
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
            const custInvoices = invoices
              .filter(
                (inv: Invoice) =>
                  inv.customerId === state.customerId &&
                  (inv.status === 'sent' || inv.status === 'overdue') &&
                  inv.total - inv.amountPaid > 0,
              )
              .sort((a: Invoice, b: Invoice) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

            state.outstandingRows = custInvoices.map((inv: Invoice) => ({
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
        },
        rejected: state => { state.isLoadingInvoices = false; },
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
  setPaymentErrors,
  setPaymentIsSaving,
  preselectInvoice,
  resetReceivePayment,
  fetchAllInvoicesForPayment,
} = receivePaymentSlice.actions;

export const {
  selectReceivePaymentState,
  selectOutstandingRows,
  selectPaymentErrors,
  selectPaymentIsSaving,
} = receivePaymentSlice.selectors;
