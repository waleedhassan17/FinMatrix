import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { ARAgingReport } from '../../../models/arAgingModel';
import { getARAgingReportAPI } from '../../../networks/reports/arAgingNetwork';
import { arAgingSerializer } from '../../../serializers/arAgingSerializer';
import { toIsoDate } from '../../../models/reportModel';

interface ARAgingState {
  asOfDate: string;
  report: ARAgingReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: ARAgingState = {
  // LOCAL calendar date — toISOString() is UTC and ages the buckets from
  // yesterday in PKT until 05:00 local.
  asOfDate: toIsoDate(new Date()),
  report: null,
  isLoading: false,
  error: '',
};

export const arAgingSlice = createAppSlice({
  name: 'arAging',
  initialState,
  reducers: create => ({
    setARAgingAsOfDate: create.reducer((state, action: PayloadAction<string>) => {
      state.asOfDate = action.payload;
    }),
    fetchARAgingReport: create.asyncThunk(
      async (asOfDate: string) => arAgingSerializer(await getARAgingReportAPI(asOfDate)),
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
          state.error = action.error?.message ?? 'Failed to load AR aging';
        },
      },
    ),
  }),
  selectors: {
    selectARAgingState: state => state,
  },
});

export const { setARAgingAsOfDate, fetchARAgingReport } = arAgingSlice.actions;
export const selectARAgingState = (rootState: { arAging?: ARAgingState }) =>
  rootState.arAging ?? initialState;
