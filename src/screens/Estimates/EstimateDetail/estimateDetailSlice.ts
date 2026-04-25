// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Detail Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Estimate } from '../../../types';
import { getEstimateByIdAPI, sendEstimateAPI } from '../../../network/estimateNetwork';
import { estimateSingleSerializer } from '../../../serializers/estimateSerializer';

export interface EstimateDetailSliceState {
  estimate: Estimate | null;
  isLoading: boolean;
  isSending: boolean;
  error: string;
}

const initialState: EstimateDetailSliceState = {
  estimate: null,
  isLoading: false,
  isSending: false,
  error: '',
};

export const estimateDetailSlice = createAppSlice({
  name: 'estimateDetail',
  initialState,
  reducers: create => ({
    resetEstimateDetail: create.reducer(state => {
      state.estimate = null;
      state.isLoading = false;
      state.isSending = false;
      state.error = '';
    }),

    fetchEstimateDetail: create.asyncThunk(
      async (estimateId: string) => {
        return await getEstimateByIdAPI(estimateId);
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.estimate = estimateSingleSerializer(action.payload);
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load estimate';
        },
      },
    ),

    // Marks estimate as sent via WhatsApp / email / generic share.
    // The backend transitions `draft → sent` automatically.
    sendEstimate: create.asyncThunk(
      async (args: {
        id: string;
        channel: 'whatsapp' | 'email' | 'share';
        toPhone?: string;
      }) => sendEstimateAPI(args.id, { channel: args.channel, toPhone: args.toPhone }),
      {
        pending: state => {
          state.isSending = true;
          state.error = '';
        },
        fulfilled: (state, action: PayloadAction<any>) => {
          const updated = estimateSingleSerializer(action.payload);
          if (updated) state.estimate = updated;
          state.isSending = false;
        },
        rejected: (state, action) => {
          state.isSending = false;
          state.error = action.error?.message ?? 'Failed to record estimate send';
        },
      },
    ),
  }),

  selectors: {
    selectEstimateDetail: state => state.estimate,
    selectEstimateDetailLoading: state => state.isLoading,
    selectEstimateDetailError: state => state.error,
    selectEstimateDetailSending: state => state.isSending,
  },
});

export const {
  resetEstimateDetail,
  fetchEstimateDetail,
  sendEstimate,
} = estimateDetailSlice.actions;
export const {
  selectEstimateDetail,
  selectEstimateDetailLoading,
  selectEstimateDetailError,
  selectEstimateDetailSending,
} = estimateDetailSlice.selectors;
