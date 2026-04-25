// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Detail Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder } from '../../../types';
import { getSalesOrderByIdAPI, sendSalesOrderAPI } from '../../../network/salesOrderNetwork';
import { salesOrderSingleSerializer } from '../../../serializers/salesOrderSerializer';

export interface SODetailSliceState {
  salesOrder: SalesOrder | null;
  isLoading: boolean;
  isSending: boolean;
  error: string;
}

const initialState: SODetailSliceState = {
  salesOrder: null,
  isLoading: false,
  isSending: false,
  error: '',
};

export const soDetailSlice = createAppSlice({
  name: 'soDetail',
  initialState,
  reducers: create => ({
    resetSODetail: create.reducer(state => {
      state.salesOrder = null;
      state.isLoading = false;
      state.isSending = false;
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

    // Marks sales order as sent via WhatsApp / email / generic share.
    sendSalesOrder: create.asyncThunk(
      async (args: {
        id: string;
        channel: 'whatsapp' | 'email' | 'share';
        toPhone?: string;
      }) => sendSalesOrderAPI(args.id, { channel: args.channel, toPhone: args.toPhone }),
      {
        pending: state => {
          state.isSending = true;
          state.error = '';
        },
        fulfilled: (state, action: PayloadAction<any>) => {
          const updated = salesOrderSingleSerializer(action.payload);
          if (updated) state.salesOrder = updated;
          state.isSending = false;
        },
        rejected: (state, action) => {
          state.isSending = false;
          state.error = action.error?.message ?? 'Failed to record sales order send';
        },
      },
    ),
  }),

  selectors: {
    selectSODetail: state => state.salesOrder,
    selectSODetailLoading: state => state.isLoading,
    selectSODetailError: state => state.error,
    selectSODetailSending: state => state.isSending,
  },
});

export const { resetSODetail, fetchSODetail, sendSalesOrder } = soDetailSlice.actions;
export const {
  selectSODetail,
  selectSODetailLoading,
  selectSODetailError,
  selectSODetailSending,
} = soDetailSlice.selectors;
