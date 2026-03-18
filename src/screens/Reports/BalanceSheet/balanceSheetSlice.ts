import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BalanceSheetReport } from '../../../models/reportModel';
import { getBalanceSheetReportAPI } from '../../../network/reportNetwork';

interface BalanceSheetState {
  asOfDate: string;
  report: BalanceSheetReport | null;
  isLoading: boolean;
  error: string;
}

const today = new Date().toISOString().slice(0, 10);

const initialState: BalanceSheetState = {
  asOfDate: today,
  report: null,
  isLoading: false,
  error: '',
};

export const balanceSheetSlice = createAppSlice({
  name: 'balanceSheet',
  initialState,
  reducers: create => ({
    setBalanceSheetAsOfDate: create.reducer((state, action: PayloadAction<string>) => {
      state.asOfDate = action.payload;
    }),
    fetchBalanceSheetReport: create.asyncThunk(
      async (asOfDate: string) => getBalanceSheetReportAPI(asOfDate),
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
          state.error = action.error?.message ?? 'Failed to load balance sheet';
        },
      },
    ),
  }),
  selectors: {
    selectBalanceSheetState: state => state,
  },
});

export const { setBalanceSheetAsOfDate, fetchBalanceSheetReport } = balanceSheetSlice.actions;
export const { selectBalanceSheetState } = balanceSheetSlice.selectors;
