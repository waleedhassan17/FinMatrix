// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Detail Slice
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import type { Estimate } from '../../../types';
import { getEstimateByIdAPI } from '../../../network/estimateNetwork';

export interface EstimateDetailSliceState {
  estimate: Estimate | null;
  isLoading: boolean;
  error: string;
}

const initialState: EstimateDetailSliceState = {
  estimate: null,
  isLoading: false,
  error: '',
};

export const estimateDetailSlice = createAppSlice({
  name: 'estimateDetail',
  initialState,
  reducers: create => ({
    resetEstimateDetail: create.reducer(state => {
      state.estimate = null;
      state.isLoading = false;
      state.error = '';
    }),

    fetchEstimateDetail: create.asyncThunk(
      async (estimateId: string) => {
        const estimate = await getEstimateByIdAPI(estimateId);
        return { estimate };
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.estimate = action.payload.estimate;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load estimate';
        },
      },
    ),
  }),

  selectors: {
    selectEstimateDetail: state => state.estimate,
    selectEstimateDetailLoading: state => state.isLoading,
    selectEstimateDetailError: state => state.error,
  },
});

export const { resetEstimateDetail, fetchEstimateDetail } = estimateDetailSlice.actions;
export const { selectEstimateDetail, selectEstimateDetailLoading, selectEstimateDetailError } = estimateDetailSlice.selectors;
