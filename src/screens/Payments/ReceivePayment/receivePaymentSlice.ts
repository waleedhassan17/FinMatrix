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
import { getInvoicesAPI, updateInvoiceAPI } from '../../../network/invoiceNetwork';
import { createPaymentAPI } from '../../../network/paymentNetwork';
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
        (inv.status === 'sent' || inv.status === 'overdue') &&
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
     * Persists the payment record AND updates each allocated
     * invoice's `amountPaid` / `status`. The thunk returns the
     * created Payment so the caller can navigate to its detail
     * screen.
     */
    savePayment: create.asyncThunk(
      async (_arg, thunkAPI) => {
        const state = thunkAPI.getState() as { receivePayment: ReceivePaymentSliceState };
        const f = state.receivePayment;

        const paymentAmount = parseFloat(f.amount) || 0;
        const allocations = f.outstandingRows
          .filter(r => r.allocated > 0)
          .map(r => ({
            invoiceId: r.invoiceId,
            invoiceNumber: r.invoiceNumber,
            amount: r.allocated,
          }));
        const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
        const overpayment = Math.max(
          0,
          Math.round((paymentAmount - totalAllocated) * 100) / 100,
        );
        const creditAmount = f.saveOverpaymentAsCredit ? overpayment : 0;

        // 1) Create the payment record
        const created = await createPaymentAPI({
          companyId: 'comp_001',
          paymentNumber: f.reference || `PAY-${String(Date.now()).slice(-6)}`,
          customerId: f.customerId,
          customerName: f.customerName,
          date: new Date(f.paymentDate).toISOString(),
          method: f.method,
          reference: f.reference,
          amount: paymentAmount,
          allocations,
          creditAmount,
          notes: f.notes,
          createdBy: 'admin_001',
        });

        // 2) Update each allocated invoice's amountPaid / status
        for (const alloc of allocations) {
          const inv = f.allInvoices.find(i => i.id === alloc.invoiceId);
          if (!inv) continue;
          const newAmountPaid =
            Math.round((inv.amountPaid + alloc.amount) * 100) / 100;
          const newStatus = newAmountPaid >= inv.total ? 'paid' : inv.status;
          await updateInvoiceAPI(inv.id, {
            amountPaid: newAmountPaid,
            status: newStatus,
          });
        }

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
