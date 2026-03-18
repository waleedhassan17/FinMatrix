import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { TrialBalanceReport } from '../../../models/reportModel';
import { getTrialBalanceReportAPI } from '../../../network/reportNetwork';

interface TrialBalanceState {
  asOfDate: string;
  report: TrialBalanceReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: TrialBalanceState = {
  asOfDate: new Date().toISOString().slice(0, 10),
  report: null,
  isLoading: false,
  error: '',
};

export const trialBalanceSlice = createAppSlice({
  name: 'trialBalance',
  initialState,
  reducers: create => ({
    setTrialBalanceAsOfDate: create.reducer((state, action: PayloadAction<string>) => {
      state.asOfDate = action.payload;
    }),
    fetchTrialBalanceReport: create.asyncThunk(
      async (asOfDate: string) => getTrialBalanceReportAPI(asOfDate),
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

export const { setTrialBalanceAsOfDate, fetchTrialBalanceReport } = trialBalanceSlice.actions;
export const { selectTrialBalanceState } = trialBalanceSlice.selectors;
