import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  type CashFlowReport,
  type ReportDateRange,
  getDefaultReportRange,
} from '../../../models/reportModel';
import { getCashFlowReportAPI } from '../../../network/reportNetwork';

interface CashFlowState {
  range: ReportDateRange;
  report: CashFlowReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: CashFlowState = {
  range: getDefaultReportRange(),
  report: null,
  isLoading: false,
  error: '',
};

export const cashFlowSlice = createAppSlice({
  name: 'cashFlow',
  initialState,
  reducers: create => ({
    setCashFlowRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    fetchCashFlowReport: create.asyncThunk(
      async (range: ReportDateRange) => getCashFlowReportAPI(range),
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
          state.error = action.error?.message ?? 'Failed to load cash flow report';
        },
      },
    ),
  }),
  selectors: {
    selectCashFlowState: state => state,
  },
});

export const { setCashFlowRange, fetchCashFlowReport } = cashFlowSlice.actions;
export const { selectCashFlowState } = cashFlowSlice.selectors;
