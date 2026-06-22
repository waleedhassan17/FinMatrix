import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { type ReportDateRange, getDefaultReportRange } from '../../../models/reportModel';
import type { TrialBalanceReport } from '../../../models/trialBalanceModel';
import { getTrialBalanceReportAPI } from '../../../network/trialBalanceNetwork';
import { trialBalanceSerializer } from '../../../serializers/trialBalanceSerializer';

interface TrialBalanceState {
  range: ReportDateRange;
  report: TrialBalanceReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: TrialBalanceState = {
  range: getDefaultReportRange(),
  report: null,
  isLoading: false,
  error: '',
};

export const trialBalanceSlice = createAppSlice({
  name: 'trialBalance',
  initialState,
  reducers: create => ({
    setTrialBalanceRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    fetchTrialBalanceReport: create.asyncThunk(
      async (range: ReportDateRange) => trialBalanceSerializer(await getTrialBalanceReportAPI(range)),
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
          state.error = action.error?.message ?? 'Failed to load trial balance';
        },
      },
    ),
  }),
  selectors: {
    selectTrialBalanceState: state => state,
  },
});

export const { setTrialBalanceRange, fetchTrialBalanceReport } = trialBalanceSlice.actions;
export const selectTrialBalanceState = (rootState: { trialBalance?: TrialBalanceState }) =>
  rootState.trialBalance ?? initialState;
