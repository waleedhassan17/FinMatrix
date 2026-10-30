// ═══════════════════════════════════════════════════════
// FinMatrix — The latest postings under a statement line
// ═══════════════════════════════════════════════════════
// Tapping a line on any statement shows its five most recent postings in
// place, with the full register a tap further. One cache serves every report:
// the balance sheet, the P&L and the trial balance all ask the same question
// of the same endpoint — the account's register, newest first.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

import {
  registerKey,
  type RegisterState,
} from '../../../models/accountRegisterModel';
import { getAccountRegisterAPI } from '../../../networks/reports/accountRegisterNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import { accountRegisterSerializer } from '../../../serializers/accountRegisterSerializer';

/** How many postings a line shows before "Open register". */
export const INLINE_ENTRY_LIMIT = 5;

export interface InlineEntriesArg {
  accountCode: string;
  startDate: string;
  endDate: string;
}

interface InlineEntriesSliceState {
  /** Keyed by registerKey(code, start, end) — one per line per period. */
  entries: Record<string, RegisterState>;
}

const initialState: InlineEntriesSliceState = { entries: {} };

export const inlineEntriesSlice = createAppSlice({
  name: 'reportDrill',
  initialState,
  reducers: create => ({
    /**
     * Forget every cached line. A pull-to-refresh calls this: the statement
     * above has just been refetched, and rows cached before it may no longer
     * be the latest five.
     */
    clearInlineEntries: create.reducer(state => {
      state.entries = {};
    }),
    /** Forget one line, so reopening it fetches afresh. */
    forgetInlineEntries: create.reducer((state, action: PayloadAction<InlineEntriesArg>) => {
      const { accountCode, startDate, endDate } = action.payload;
      delete state.entries[registerKey(accountCode, startDate, endDate)];
    }),
    fetchInlineEntries: create.asyncThunk(
      async (arg: InlineEntriesArg, thunkAPI) => {
        try {
          return accountRegisterSerializer(
            await getAccountRegisterAPI(arg.accountCode, {
              startDate: arg.startDate,
              endDate: arg.endDate,
              order: 'desc',
              limit: INLINE_ENTRY_LIMIT,
              page: 1,
            }),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          const { accountCode, startDate, endDate } = action.meta.arg;
          const key = registerKey(accountCode, startDate, endDate);
          // Keep rows already shown while they refresh.
          const prev = state.entries[key]?.data ?? null;
          state.entries[key] = { status: 'loading', error: '', data: prev };
        },
        fulfilled: (state, action) => {
          const { accountCode, startDate, endDate } = action.meta.arg;
          state.entries[registerKey(accountCode, startDate, endDate)] = {
            status: 'succeeded',
            error: '',
            data: action.payload,
          };
        },
        rejected: (state, action) => {
          const { accountCode, startDate, endDate } = action.meta.arg;
          const key = registerKey(accountCode, startDate, endDate);
          const r = action.payload as ReportRejection | undefined;
          state.entries[key] = {
            status: 'failed',
            error: r?.message ?? action.error?.message ?? 'Failed to load transactions',
            data: state.entries[key]?.data ?? null,
            notFound: isFinalRejection(r),
          };
        },
      },
    ),
  }),
});

export const { clearInlineEntries, forgetInlineEntries, fetchInlineEntries } =
  inlineEntriesSlice.actions;

export const selectInlineEntries = (
  rootState: { reportDrill?: InlineEntriesSliceState },
  arg: InlineEntriesArg,
): RegisterState | undefined =>
  (rootState.reportDrill ?? initialState).entries[
    registerKey(arg.accountCode, arg.startDate, arg.endDate)
  ];

export const selectInlineEntriesMap = (rootState: { reportDrill?: InlineEntriesSliceState }) =>
  (rootState.reportDrill ?? initialState).entries;

/**
 * Fetch a line's postings unless they are already here. A failed attempt is
 * retried: a failure is still an entry in the map, and treating presence as
 * "loaded" cached a transient network error for the life of the screen.
 */
export const needsInlineFetch = (state: RegisterState | undefined): boolean =>
  !state || state.status === 'idle' || (state.status === 'failed' && !state.notFound);
