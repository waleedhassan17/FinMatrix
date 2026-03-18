import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  type ProfitLossReport,
  type ReportDateRange,
  getComparisonRange,
  getDefaultReportRange,
} from '../../../models/reportModel';
import { getProfitLossReportAPI } from '../../../network/reportNetwork';

interface ProfitLossState {
  range: ReportDateRange;
  comparisonEnabled: boolean;
  report: ProfitLossReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: ProfitLossState = {
  range: getDefaultReportRange(),
  comparisonEnabled: false,
  report: null,
  isLoading: false,
  error: '',
};

export const profitLossSlice = createAppSlice({
  name: 'profitLoss',
  initialState,
  reducers: create => ({
    setProfitLossRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    setProfitLossComparisonEnabled: create.reducer((state, action: PayloadAction<boolean>) => {
      state.comparisonEnabled = action.payload;
    }),
    fetchProfitLossReport: create.asyncThunk(
      async (
        payload: { range: ReportDateRange; comparisonEnabled: boolean },
      ) => {
        const comparisonRange = payload.comparisonEnabled
          ? getComparisonRange(payload.range)
          : undefined;
        return getProfitLossReportAPI(payload.range, comparisonRange);
      },
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
          state.error = action.error?.message ?? 'Failed to load P&L report';
        },
      },
    ),
  }),
  selectors: {
    selectProfitLossState: state => state,
  },
});

export const {
  setProfitLossRange,
  setProfitLossComparisonEnabled,
  fetchProfitLossReport,
} = profitLossSlice.actions;

export const { selectProfitLossState } = profitLossSlice.selectors;
