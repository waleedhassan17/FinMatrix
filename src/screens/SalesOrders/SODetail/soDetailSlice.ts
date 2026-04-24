// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Detail Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder } from '../../../types';
import { getSalesOrderByIdAPI } from '../../../network/salesOrderNetwork';
import { salesOrderSingleSerializer } from '../../../serializers/salesOrderSerializer';

export interface SODetailSliceState {
  salesOrder: SalesOrder | null;
  isLoading: boolean;
  error: string;
}

const initialState: SODetailSliceState = {
  salesOrder: null,
  isLoading: false,
  error: '',
};

export const soDetailSlice = createAppSlice({
  name: 'soDetail',
  initialState,
  reducers: create => ({
    resetSODetail: create.reducer(state => {
      state.salesOrder = null;
      state.isLoading = false;
      state.error = '';
    }),

    fetchSODetail: create.asyncThunk(
      async (soId: string) => {
        return await getSalesOrderByIdAPI(soId);
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.salesOrder = salesOrderSingleSerializer(action.payload);
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load sales order';
        },
      },
    ),
  }),

  selectors: {
    selectSODetail: state => state.salesOrder,
    selectSODetailLoading: state => state.isLoading,
    selectSODetailError: state => state.error,
  },
});

export const { resetSODetail, fetchSODetail } = soDetailSlice.actions;
export const { selectSODetail, selectSODetailLoading, selectSODetailError } = soDetailSlice.selectors;
