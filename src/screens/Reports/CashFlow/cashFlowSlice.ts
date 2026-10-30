import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { type ReportDateRange, getDefaultReportRange } from '../../../models/reportModel';
import {
  lineEntriesKey,
  type CashFlowLineEntries,
  type CashFlowMethod,
  type CashFlowReport,
} from '../../../models/cashFlowModel';
import type { FinancialHealth } from '../../../models/kpiModel';
import { remoteDone, remoteFailed, remoteIdle, remoteLoading, type Remote } from '../../../models/remoteModel';
import { getCashFlowLineEntriesAPI, getCashFlowReportAPI } from '../../../networks/reports/cashFlowNetwork';
import { getFinancialHealthAPI } from '../../../networks/reports/balanceSheetNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import { cashFlowLineEntriesSerializer, cashFlowSerializer } from '../../../serializers/cashFlowSerializer';
import { financialHealthSerializer } from '../../../serializers/kpiSerializer';

/** Rows per page of a cash-flow line. */
export const CASH_LINE_PAGE = 50;

export interface LineEntriesRemote extends Remote<CashFlowLineEntries> {
  loadingMore?: boolean;
}

interface CashFlowState {
  range: ReportDateRange;
  /** True once the user picks their own dates — see getDefaultReportRange. */
  isCustomRange: boolean;
  method: CashFlowMethod;
  report: CashFlowReport | null;
  isLoading: boolean;
  error: string;
  requestId: string;
  /** Financial health at the end date: the runway card. */
  health: Remote<FinancialHealth>;
  /** Keyed by lineEntriesKey — a line AND a period. */
  lines: Record<string, LineEntriesRemote>;
}

const initialState: CashFlowState = {
  range: getDefaultReportRange(),
  isCustomRange: false,
  method: 'direct',
  report: null,
  isLoading: false,
  error: '',
  requestId: '',
  health: remoteIdle(),
  lines: {},
};

export interface CashLineArg {
  lineKey: string;
  range: ReportDateRange;
  page?: number;
}

const msg = (action: { payload?: unknown; error?: { message?: string } }, fallback: string) => {
  const r = action.payload as ReportRejection | undefined;
  return { message: r?.message ?? action.error?.message ?? fallback, final: isFinalRejection(r) };
};

export const cashFlowSlice = createAppSlice({
  name: 'cashFlow',
  initialState,
  reducers: create => ({
    setCashFlowRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
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
    refreshCashFlowRange: create.reducer(state => {
      if (!state.isCustomRange) state.range = getDefaultReportRange();
    }),
    setCashFlowMethod: create.reducer((state, action: PayloadAction<CashFlowMethod>) => {
      state.method = action.payload;
    }),
    fetchCashFlowReport: create.asyncThunk(
      async (range: ReportDateRange) => cashFlowSerializer(await getCashFlowReportAPI(range)),
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
          state.error = action.error?.message ?? 'Failed to load cash flow';
        },
      },
    ),
    fetchCashFlowHealth: create.asyncThunk(
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
          const r = msg(action, 'Failed to load runway');
          state.health = remoteFailed(state.health, r.message, r.final);
        },
      },
    ),
    /**
     * One page of a line's cash postings: page 1 replaces (a refresh), later
     * pages append without repeating a row already held.
     */
    fetchCashFlowLineEntries: create.asyncThunk(
      async (arg: CashLineArg, thunkAPI) => {
        try {
          return cashFlowLineEntriesSerializer(
            await getCashFlowLineEntriesAPI(arg.lineKey, {
              ...arg.range,
              page: arg.page ?? 1,
              limit: CASH_LINE_PAGE,
            }),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          const key = lineEntriesKey(action.meta.arg.lineKey, action.meta.arg.range);
          const prev = state.lines[key];
          if ((action.meta.arg.page ?? 1) > 1 && prev?.data) {
            state.lines[key] = { ...prev, loadingMore: true };
            return;
          }
          state.lines[key] = remoteLoading(prev);
        },
        fulfilled: (state, action) => {
          const key = lineEntriesKey(action.meta.arg.lineKey, action.meta.arg.range);
          const prev = state.lines[key]?.data;
          const next = action.payload;
          if ((action.meta.arg.page ?? 1) > 1 && prev && next) {
            const seen = new Set(prev.entries.map(e => e.id));
            state.lines[key] = {
              ...remoteDone({ ...next, entries: [...prev.entries, ...next.entries.filter(e => !seen.has(e.id))] }),
              loadingMore: false,
            };
            return;
          }
          state.lines[key] = remoteDone(next);
        },
        rejected: (state, action) => {
          const key = lineEntriesKey(action.meta.arg.lineKey, action.meta.arg.range);
          const prev = state.lines[key];
          const r = msg(action, 'Failed to load the postings');
          if ((action.meta.arg.page ?? 1) > 1 && prev?.data) {
            state.lines[key] = { ...prev, loadingMore: false, error: r.message };
            return;
          }
          state.lines[key] = remoteFailed(prev, r.message, r.final);
        },
      },
    ),
  }),
  selectors: {
    selectCashFlowState: state => state,
  },
});

export const {
  setCashFlowRange,
  refreshCashFlowRange,
  setCashFlowMethod,
  fetchCashFlowReport,
  fetchCashFlowHealth,
  fetchCashFlowLineEntries,
} = cashFlowSlice.actions;
export const selectCashFlowState = (rootState: { cashFlow?: CashFlowState }) =>
  rootState.cashFlow ?? initialState;

export const selectCashFlowLine = (rootState: { cashFlow?: CashFlowState }, lineKey: string, range: ReportDateRange) =>
  (rootState.cashFlow ?? initialState).lines[lineEntriesKey(lineKey, range)];
