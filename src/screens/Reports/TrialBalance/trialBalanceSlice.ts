import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { type ReportDateRange, getDefaultReportRange } from '../../../models/reportModel';
import type { TrialBalanceMode, TrialBalanceReport } from '../../../models/trialBalanceModel';
import { getTrialBalanceReportAPI } from '../../../networks/reports/trialBalanceNetwork';
import { trialBalanceSerializer } from '../../../serializers/trialBalanceSerializer';

interface TrialBalanceState {
  range: ReportDateRange;
  /** True once the user picks their own dates — see getDefaultReportRange. */
  isCustomRange: boolean;
  /** Closing by default: the trial balance an accountant reaches for first. */
  mode: TrialBalanceMode;
  report: TrialBalanceReport | null;
  isLoading: boolean;
  error: string;
  /** The latest request; switching modes quickly must not show an older answer. */
  requestId: string;
}

const initialState: TrialBalanceState = {
  range: getDefaultReportRange(),
  isCustomRange: false,
  mode: 'closing',
  report: null,
  isLoading: false,
  error: '',
  requestId: '',
};

export interface TrialBalanceArg {
  range: ReportDateRange;
  mode?: TrialBalanceMode;
}

export const trialBalanceSlice = createAppSlice({
  name: 'trialBalance',
  initialState,
  reducers: create => ({
    setTrialBalanceRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
      state.isCustomRange = true;
    }),
    /**
     * Re-seed the window to today unless the user chose their own.
     *
     * initialState is evaluated once at bundle startup, so without this the
     * range freezes on the day the app launched and the report silently
     * stops including anything newer. Screens dispatch this on focus.
     */
    refreshTrialBalanceRange: create.reducer(state => {
      if (!state.isCustomRange) state.range = getDefaultReportRange();
    }),
    setTrialBalanceMode: create.reducer((state, action: PayloadAction<TrialBalanceMode>) => {
      state.mode = action.payload;
    }),
    fetchTrialBalanceReport: create.asyncThunk(
      async (arg: ReportDateRange | TrialBalanceArg) => {
        const a: TrialBalanceArg = 'range' in arg ? arg : { range: arg };
        return trialBalanceSerializer(await getTrialBalanceReportAPI({ ...a.range, mode: a.mode }));
      },
      {
        pending: (state, action) => {
          state.isLoading = true;
          state.error = '';
          state.requestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.requestId) return;
          state.isLoading = false;
          state.report = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.requestId) return;
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

export const { setTrialBalanceRange, refreshTrialBalanceRange, setTrialBalanceMode, fetchTrialBalanceReport } =
  trialBalanceSlice.actions;
export const selectTrialBalanceState = (rootState: { trialBalance?: TrialBalanceState }) =>
  rootState.trialBalance ?? initialState;
