import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  type ReportDateRange,
  getComparisonRange,
  getDefaultReportRange,
} from '../../../models/reportModel';
import {
  emptyLineEntries,
  type LineEntriesState,
  type ProfitLossReport,
} from '../../../models/profitLossModel';
import {
  getProfitLossReportAPI,
  getStatementLineEntriesAPI,
} from '../../../networks/reports/profitLossNetwork';
import {
  profitLossSerializer,
  statementLineEntriesSerializer,
} from '../../../serializers/profitLossSerializer';

/** How many ledger rows one expanded line pulls. */
export const LINE_ENTRY_LIMIT = 50;

interface ProfitLossState {
  range: ReportDateRange;
  /** True once the user picks their own dates — see getDefaultReportRange. */
  isCustomRange: boolean;
  comparisonEnabled: boolean;
  report: ProfitLossReport | null;
  isLoading: boolean;
  error: string;
  /** Which account lines are open, keyed by account code. */
  expanded: Record<string, boolean>;
  /** The transactions behind each opened line, keyed by account code. */
  entries: Record<string, LineEntriesState>;
}

const initialState: ProfitLossState = {
  range: getDefaultReportRange(),
  isCustomRange: false,
  comparisonEnabled: false,
  report: null,
  isLoading: false,
  error: '',
  expanded: {},
  entries: {},
};

export const profitLossSlice = createAppSlice({
  name: 'profitLoss',
  initialState,
  reducers: create => ({
    setProfitLossRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
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
    refreshProfitLossRange: create.reducer(state => {
      if (!state.isCustomRange) state.range = getDefaultReportRange();
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
        return profitLossSerializer(
          await getProfitLossReportAPI(payload.range, comparisonRange),
        );
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.report = action.payload;
          // A new period means the cached transactions describe the old one.
          // Collapsing rather than refetching keeps the reload to one request;
          // the user reopens the lines they still care about.
          state.expanded = {};
          state.entries = {};
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load P&L report';
        },
      },
    ),

    toggleProfitLossLine: create.reducer((state, action: PayloadAction<string>) => {
      const code = action.payload;
      state.expanded[code] = !state.expanded[code];
    }),

    /**
     * The posted transactions behind one account line.
     *
     * Keyed by account code in a map rather than held as a single "open line",
     * so several lines can stay open at once and a row that has already been
     * fetched reopens instantly.
     */
    fetchProfitLossLineEntries: create.asyncThunk(
      async (payload: { accountCode: string; range: ReportDateRange }) =>
        statementLineEntriesSerializer(
          await getStatementLineEntriesAPI(payload.accountCode, {
            ...payload.range,
            limit: LINE_ENTRY_LIMIT,
          }),
        ),
      {
        pending: (state, action) => {
          const code = action.meta.arg.accountCode;
          state.entries[code] = { ...emptyLineEntries, status: 'loading' };
        },
        fulfilled: (state, action) => {
          const code = action.meta.arg.accountCode;
          state.entries[code] = { status: 'succeeded', error: '', data: action.payload };
        },
        rejected: (state, action) => {
          const code = action.meta.arg.accountCode;
          state.entries[code] = {
            status: 'failed',
            error: action.error?.message ?? 'Failed to load transactions',
            data: null,
          };
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
  refreshProfitLossRange,
  setProfitLossComparisonEnabled,
  fetchProfitLossReport,
  toggleProfitLossLine,
  fetchProfitLossLineEntries,
} = profitLossSlice.actions;

export const selectProfitLossState = (rootState: { profitLoss?: ProfitLossState }) =>
  rootState.profitLoss ?? initialState;
