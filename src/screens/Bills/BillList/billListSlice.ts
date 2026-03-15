// ═══════════════════════════════════════════════════════
// FinMatrix — Bill List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Bill, BillStatus } from '../../../types';
import { getBillsAPI, deleteBillAPI } from '../../../network/billNetwork';

export type BillStatusFilter = 'all' | BillStatus;

export interface BillListSliceState {
  bills: Bill[];
  searchQuery: string;
  statusFilter: BillStatusFilter;
  isLoading: boolean;
  error: string;
}

const initialState: BillListSliceState = {
  bills: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
};

export const billListSlice = createAppSlice({
  name: 'billList',
  initialState,
  reducers: create => ({
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<BillStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    resetBillList: create.reducer(state => {
      Object.assign(state, initialState);
    }),

    fetchBills: create.asyncThunk(
      async () => getBillsAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => { state.bills = action.payload; state.isLoading = false; },
        rejected: (state, action) => { state.isLoading = false; state.error = action.error?.message ?? 'Failed to load bills'; },
      },
    ),

    removeBill: create.asyncThunk(
      async (billId: string) => {
        await deleteBillAPI(billId);
        return billId;
      },
      {
        fulfilled: (state, action) => {
          state.bills = state.bills.filter(b => b.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectBills: state => state.bills,
    selectBillSearchQuery: state => state.searchQuery,
    selectBillStatusFilter: state => state.statusFilter,
    selectBillIsLoading: state => state.isLoading,
    selectBillError: state => state.error,
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  resetBillList,
  fetchBills,
  removeBill,
} = billListSlice.actions;

export const {
  selectBills,
  selectBillSearchQuery,
  selectBillStatusFilter,
  selectBillIsLoading,
  selectBillError,
} = billListSlice.selectors;
