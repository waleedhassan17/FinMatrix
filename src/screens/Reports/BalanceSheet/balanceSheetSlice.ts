import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BalanceSheetReport } from '../../../models/balanceSheetModel';
import { getBalanceSheetReportAPI } from '../../../networks/reports/balanceSheetNetwork';
import { balanceSheetSerializer } from '../../../serializers/balanceSheetSerializer';
import { toIsoDate } from '../../../models/reportModel';

interface BalanceSheetState {
  asOfDate: string;
  report: BalanceSheetReport | null;
  isLoading: boolean;
  error: string;
}

// LOCAL calendar date. toISOString() is UTC, so in PKT (UTC+5) it returns
// yesterday until 05:00 — the sheet would open closed as of the wrong day.
const today = toIsoDate(new Date());

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
      async (asOfDate: string) => balanceSheetSerializer(await getBalanceSheetReportAPI(asOfDate)),
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
export const selectBalanceSheetState = (rootState: { balanceSheet?: BalanceSheetState }) =>
  rootState.balanceSheet ?? initialState;
