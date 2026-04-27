// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with GLScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { getLedgerEntriesAPI } from '../../network/glNetwork';
import { glSerializer } from '../../serializers/glSerializer';
import type { GLApiEntry } from '../../models/glModel';

export interface GLDateRange {
  fromDate: string; // ISO string
  toDate: string;
}

export interface GLSliceState {
  entries: GLApiEntry[];
  dateRange: GLDateRange;
  selectedAccountId: string; // '' = All Accounts
  isLoading: boolean;
  error: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  page: number;
  totalPages: number;
  totalEntries: number;
}

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

const initialState: GLSliceState = {
  entries: [],
  dateRange: { fromDate: startOfMonth, toDate: endOfMonth },
  selectedAccountId: '',
  isLoading: false,
  error: '',
  totalDebits: 0,
  totalCredits: 0,
  isBalanced: true,
  page: 1,
  totalPages: 1,
  totalEntries: 0,
};

export const glSlice = createAppSlice({
  name: 'gl',
  initialState,
  reducers: create => ({
    setDateRange: create.reducer((state, action: PayloadAction<GLDateRange>) => {
      state.dateRange = action.payload;
    }),
    setSelectedAccountId: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedAccountId = action.payload;
    }),
    resetGL: create.reducer(state => {
      state.selectedAccountId = '';
      state.dateRange = { fromDate: startOfMonth, toDate: endOfMonth };
    }),
    fetchGLEntries: create.asyncThunk(
      async (_arg, thunkAPI) => {
        const root = thunkAPI.getState() as { gl: GLSliceState };
        const { dateRange, selectedAccountId } = root.gl;
        const response = await getLedgerEntriesAPI({
          startDate: dateRange.fromDate.slice(0, 10),
          endDate: dateRange.toDate.slice(0, 10),
          ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
        });
        return response;
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = glSerializer(action.payload);
          state.entries = data.entries;
          state.totalDebits = data.totalDebits;
          state.totalCredits = data.totalCredits;
          state.isBalanced = data.isBalanced;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalEntries = data.totalEntries;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch ledger entries';
        },
      },
    ),
  }),
  selectors: {
    selectGLEntries: state => state.entries,
    selectDateRange: state => state.dateRange,
    selectSelectedAccountId: state => state.selectedAccountId,
    selectGLIsLoading: state => state.isLoading,
    selectGLError: state => state.error,
    selectGLTotalDebits: state => state.totalDebits,
    selectGLTotalCredits: state => state.totalCredits,
    selectGLIsBalanced: state => state.isBalanced,
  },
});

export const { setDateRange, setSelectedAccountId, resetGL, fetchGLEntries } = glSlice.actions;
export const {
  selectGLEntries,
  selectDateRange,
  selectSelectedAccountId,
  selectGLIsLoading,
  selectGLError,
  selectGLTotalDebits,
  selectGLTotalCredits,
  selectGLIsBalanced,
} = glSlice.selectors;

/** Memoized — returns a stable object reference unless inputs change. */
export const selectGLTotals = createSelector(
  [selectGLTotalDebits, selectGLTotalCredits, selectGLIsBalanced],
  (totalDebits, totalCredits, isBalanced) => ({
    totalDebits,
    totalCredits,
    isBalanced,
  }),
);
