// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with GLScreen.tsx
// Owns GL entries, date range, account filter, loading.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { JournalEntry } from '../../types';
import { generalLedgerData } from '../../dummy-data/generalLedger';

export interface GLDateRange {
  fromDate: string; // ISO string
  toDate: string;
}

export interface GLSliceState {
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  dateRange: GLDateRange;
  selectedAccountId: string; // '' = All Accounts
  isLoading: boolean;
  error: string;
}

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

const initialState: GLSliceState = {
  entries: [],
  filteredEntries: [],
  dateRange: { fromDate: startOfMonth, toDate: endOfMonth },
  selectedAccountId: '',
  isLoading: false,
  error: '',
};

function applyFilters(
  entries: JournalEntry[],
  dateRange: GLDateRange,
  accountId: string,
): JournalEntry[] {
  return entries.filter(e => {
    const d = e.date;
    const inRange = d >= dateRange.fromDate.slice(0, 10) && d <= dateRange.toDate.slice(0, 10);
    if (!inRange) return false;
    if (accountId) {
      return e.lines.some(l => l.accountId === accountId);
    }
    return true;
  });
}

export const glSlice = createAppSlice({
  name: 'gl',
  initialState,
  reducers: create => ({
    setDateRange: create.reducer((state, action: PayloadAction<GLDateRange>) => {
      state.dateRange = action.payload;
      state.filteredEntries = applyFilters(state.entries, state.dateRange, state.selectedAccountId);
    }),
    setSelectedAccountId: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedAccountId = action.payload;
      state.filteredEntries = applyFilters(state.entries, state.dateRange, state.selectedAccountId);
    }),
    resetGL: create.reducer(state => {
      state.selectedAccountId = '';
      state.dateRange = { fromDate: startOfMonth, toDate: endOfMonth };
      state.filteredEntries = applyFilters(state.entries, state.dateRange, '');
    }),
    fetchGLEntries: create.asyncThunk(
      async () => {
        // simulate network delay
        await new Promise(r => setTimeout(r, 600));
        return generalLedgerData;
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.entries = action.payload;
          state.filteredEntries = applyFilters(action.payload, state.dateRange, state.selectedAccountId);
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
    selectFilteredEntries: state => state.filteredEntries,
    selectDateRange: state => state.dateRange,
    selectSelectedAccountId: state => state.selectedAccountId,
    selectGLIsLoading: state => state.isLoading,
    selectGLError: state => state.error,
  },
});

export const { setDateRange, setSelectedAccountId, resetGL, fetchGLEntries } = glSlice.actions;
export const {
  selectGLEntries,
  selectFilteredEntries,
  selectDateRange,
  selectSelectedAccountId,
  selectGLIsLoading,
  selectGLError,
} = glSlice.selectors;
