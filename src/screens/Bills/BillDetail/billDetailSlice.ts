// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import type { Bill, BillPayment } from '../../../types';
import { getBillByIdAPI } from '../../../network/billNetwork';
import { getBillPaymentsByBillAPI } from '../../../network/billNetwork';

export interface BillDetailSliceState {
  bill: Bill | null;
  payments: BillPayment[];
  isLoading: boolean;
  error: string;
}

const initialState: BillDetailSliceState = {
  bill: null,
  payments: [],
  isLoading: false,
  error: '',
};

export const billDetailSlice = createAppSlice({
  name: 'billDetail',
  initialState,
  reducers: create => ({
    resetBillDetail: create.reducer(state => {
      state.bill = null;
      state.payments = [];
      state.isLoading = false;
      state.error = '';
    }),

    fetchBillDetail: create.asyncThunk(
      async (billId: string) => {
        const [bill, payments] = await Promise.all([
          getBillByIdAPI(billId),
          getBillPaymentsByBillAPI(billId),
        ]);
        return { bill, payments };
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.bill = action.payload.bill;
          state.payments = action.payload.payments;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load bill';
        },
      },
    ),
  }),

  selectors: {
    selectBillDetail: state => state.bill,
    selectBillPayments: state => state.payments,
    selectBillDetailLoading: state => state.isLoading,
    selectBillDetailError: state => state.error,
  },
});

export const {
  resetBillDetail,
  fetchBillDetail,
} = billDetailSlice.actions;

export const {
  selectBillDetail,
  selectBillPayments,
  selectBillDetailLoading,
  selectBillDetailError,
} = billDetailSlice.selectors;
