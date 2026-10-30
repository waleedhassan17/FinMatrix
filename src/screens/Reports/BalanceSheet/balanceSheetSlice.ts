import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type {
  BalanceSheetMode,
  BalanceSheetReport,
  RetainedEarningsRollforward,
} from '../../../models/balanceSheetModel';
import type { AsOfCompareKey } from '../../../models/comparisonModel';
import type { FinancialHealth } from '../../../models/kpiModel';
import {
  remoteDone,
  remoteFailed,
  remoteIdle,
  remoteLoading,
  type Remote,
} from '../../../models/remoteModel';
import {
  getBalanceSheetReportAPI,
  getFinancialHealthAPI,
  getRetainedEarningsAPI,
} from '../../../networks/reports/balanceSheetNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import {
  balanceSheetSerializer,
  retainedEarningsSerializer,
} from '../../../serializers/balanceSheetSerializer';
import { financialHealthSerializer } from '../../../serializers/kpiSerializer';
import { toIsoDate } from '../../../models/reportModel';

interface BalanceSheetState {
  /** True once the user picks their own date — see getDefaultReportRange. */
  isCustomRange: boolean;
  asOfDate: string;
  report: BalanceSheetReport | null;
  isLoading: boolean;
  error: string;
  /** The latest statement request; an older one landing late is ignored. */
  requestId: string;
  /** Balance | Compare | % of assets. */
  mode: BalanceSheetMode;
  /** What Compare reads the prior figures at; resolved to a date on screen. */
  compareKey: AsOfCompareKey;
  customCompare: string | null;
  health: Remote<FinancialHealth>;
  rollforward: Remote<RetainedEarningsRollforward>;
}

const initialState: BalanceSheetState = {
  isCustomRange: false,
  // LOCAL calendar date. toISOString() is UTC, so in PKT (UTC+5) it returns
  // yesterday until 05:00 — the sheet would open closed as of the wrong day.
  //
  // This is still only the value at bundle startup; refreshBalanceSheetAsOfDate
  // is what keeps it honest once the app has been running for a while.
  asOfDate: toIsoDate(new Date()),
  report: null,
  isLoading: false,
  error: '',
  requestId: '',
  mode: 'balance',
  compareKey: 'priorMonthEnd',
  customCompare: null,
  health: remoteIdle(),
  rollforward: remoteIdle(),
};

export interface BalanceSheetArg {
  asOfDate: string;
  /** Reports v2: prior figures at this date. Null for none. */
  compareTo?: string | null;
}

const rejectionOf = (action: { payload?: unknown; error?: { message?: string } }, fallback: string) => {
  const r = action.payload as ReportRejection | undefined;
  return { message: r?.message ?? action.error?.message ?? fallback, final: isFinalRejection(r) };
};

export const balanceSheetSlice = createAppSlice({
  name: 'balanceSheet',
  initialState,
  reducers: create => ({
    setBalanceSheetAsOfDate: create.reducer((state, action: PayloadAction<string>) => {
      state.asOfDate = action.payload;
      state.isCustomRange = true;
    }),
    /**
     * Re-seed to today unless the user chose their own date.
     *
     * initialState is evaluated once at bundle startup, so without this the
     * date freezes on the day the app launched and the report silently
     * stops including anything newer. Screens dispatch this on focus.
     */
    refreshBalanceSheetAsOfDate: create.reducer(state => {
      if (!state.isCustomRange) state.asOfDate = toIsoDate(new Date());
    }),
    setBalanceSheetMode: create.reducer((state, action: PayloadAction<BalanceSheetMode>) => {
      state.mode = action.payload;
    }),
    setBalanceSheetComparison: create.reducer(
      (state, action: PayloadAction<{ key: AsOfCompareKey; customDate: string | null }>) => {
        state.compareKey = action.payload.key;
        state.customCompare = action.payload.customDate;
        // "No comparison" from the sheet is a way back to the plain statement.
        if (action.payload.key === 'none' && state.mode === 'compare') state.mode = 'balance';
      },
    ),
    fetchBalanceSheetReport: create.asyncThunk(
      async (arg: string | BalanceSheetArg) => {
        const a = typeof arg === 'string' ? { asOfDate: arg } : arg;
        return balanceSheetSerializer(await getBalanceSheetReportAPI(a));
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
          state.error = action.error?.message ?? 'Failed to load balance sheet';
        },
      },
    ),
    fetchFinancialHealth: create.asyncThunk(
      async (asOfDate: string, thunkAPI) => {
        try {
          return financialHealthSerializer(await getFinancialHealthAPI(asOfDate));
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: state => {
          state.health = remoteLoading(state.health);
        },
        fulfilled: (state, action) => {
          state.health = remoteDone(action.payload);
        },
        rejected: (state, action) => {
          const r = rejectionOf(action, 'Failed to load financial health');
          state.health = remoteFailed(state.health, r.message, r.final);
        },
      },
    ),
    fetchRetainedEarnings: create.asyncThunk(
      async (asOfDate: string, thunkAPI) => {
        try {
          return retainedEarningsSerializer(await getRetainedEarningsAPI(asOfDate));
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: state => {
          // A different date's rollforward must not show under this one.
          state.rollforward = remoteLoading(undefined);
        },
        fulfilled: (state, action) => {
          state.rollforward = remoteDone(action.payload);
        },
        rejected: (state, action) => {
          const r = rejectionOf(action, 'Failed to load retained earnings');
          state.rollforward = remoteFailed(undefined, r.message, r.final);
        },
      },
    ),
  }),
  selectors: {
    selectBalanceSheetState: state => state,
  },
});

export const {
  setBalanceSheetAsOfDate,
  refreshBalanceSheetAsOfDate,
  setBalanceSheetMode,
  setBalanceSheetComparison,
  fetchBalanceSheetReport,
  fetchFinancialHealth,
  fetchRetainedEarnings,
} = balanceSheetSlice.actions;
export const selectBalanceSheetState = (rootState: { balanceSheet?: BalanceSheetState }) =>
  rootState.balanceSheet ?? initialState;
