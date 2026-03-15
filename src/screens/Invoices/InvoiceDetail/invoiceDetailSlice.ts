// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import type { Invoice, Payment } from '../../../types';
import { getInvoiceByIdAPI } from '../../../network/invoiceNetwork';
import { getPaymentsByInvoiceAPI } from '../../../network/paymentNetwork';

export interface InvoiceDetailSliceState {
  invoice: Invoice | null;
  payments: Payment[];
  isLoading: boolean;
  error: string;
}

const initialState: InvoiceDetailSliceState = {
  invoice: null,
  payments: [],
  isLoading: false,
  error: '',
};

export const invoiceDetailSlice = createAppSlice({
  name: 'invoiceDetail',
  initialState,
  reducers: create => ({
    resetInvoiceDetail: create.reducer(state => {
      state.invoice = null;
      state.payments = [];
      state.isLoading = false;
      state.error = '';
    }),

    fetchInvoiceDetail: create.asyncThunk(
      async (invoiceId: string) => {
        const [invoice, payments] = await Promise.all([
          getInvoiceByIdAPI(invoiceId),
          getPaymentsByInvoiceAPI(invoiceId),
        ]);
        return { invoice, payments };
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.invoice = action.payload.invoice;
          state.payments = action.payload.payments;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load invoice';
        },
      },
    ),
  }),

  selectors: {
    selectInvoiceDetail: state => state.invoice,
    selectInvoicePayments: state => state.payments,
    selectInvoiceDetailLoading: state => state.isLoading,
    selectInvoiceDetailError: state => state.error,
  },
});

export const {
  resetInvoiceDetail,
  fetchInvoiceDetail,
} = invoiceDetailSlice.actions;

export const {
  selectInvoiceDetail,
  selectInvoicePayments,
  selectInvoiceDetailLoading,
  selectInvoiceDetailError,
} = invoiceDetailSlice.selectors;
