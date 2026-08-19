// AP aging shares A/R's bucket model: the backend builds both with the same
// bucketAging() helper, so the row/total shapes are identical.
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { ARAgingReport } from '../../../models/arAgingModel';
import { getAPAgingReportAPI } from '../../../networks/reports/apAgingNetwork';
import { arAgingSerializer } from '../../../serializers/arAgingSerializer';

interface APAgingState {
  asOfDate: string;
  report: ARAgingReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: APAgingState = {
  asOfDate: new Date().toISOString().slice(0, 10),
  report: null,
  isLoading: false,
  error: '',
};

export const apAgingSlice = createAppSlice({
  name: 'apAging',
  initialState,
  reducers: create => ({
    setAPAgingAsOfDate: create.reducer((state, action: PayloadAction<string>) => {
      state.asOfDate = action.payload;
    }),
    fetchARAgingReport: create.asyncThunk(
      async (asOfDate: string) => arAgingSerializer(await getAPAgingReportAPI(asOfDate)),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.report = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load AP aging';
        },
      },
    ),
  }),
  selectors: {
    selectAPAgingState: state => state,
  },
});

export const { setAPAgingAsOfDate, fetchARAgingReport } = apAgingSlice.actions;
export const selectAPAgingState = (rootState: { apAging?: APAgingState }) =>
  rootState.apAging ?? initialState;
