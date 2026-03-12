// ═══════════════════════════════════════════════════════
// FinMatrix — JE List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with JEListScreen.tsx
// Owns JE entries data, filter, search, CRUD thunks.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { JournalEntry, JournalEntryStatus } from '../../../types';
import { journalEntriesData } from '../../../dummy-data/journalEntries';

export type JEFilter = 'all' | JournalEntryStatus;

export interface JEListSliceState {
  entries: JournalEntry[];
  searchQuery: string;
  activeFilter: JEFilter;
  isLoading: boolean;
  error: string;
}

const initialState: JEListSliceState = {
  entries: [],
  searchQuery: '',
  activeFilter: 'all',
  isLoading: false,
  error: '',
};

// In-memory mutable copy for create/update/void
let entriesStore: JournalEntry[] = [...journalEntriesData];

export const jeListSlice = createAppSlice({
  name: 'jeList',
  initialState,
  reducers: create => ({
    setJESearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setJEActiveFilter: create.reducer((state, action: PayloadAction<JEFilter>) => {
      state.activeFilter = action.payload;
    }),
    resetJEList: create.reducer(state => {
      state.searchQuery = '';
      state.activeFilter = 'all';
    }),

    fetchJournalEntries: create.asyncThunk(
      async () => {
        await new Promise(r => setTimeout(r, 500));
        return [...entriesStore];
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.entries = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch entries';
        },
      },
    ),

    createJournalEntry: create.asyncThunk(
      async (entry: JournalEntry) => {
        await new Promise(r => setTimeout(r, 300));
        entriesStore.push(entry);
        return entry;
      },
      {
        fulfilled: (state, action) => { state.entries.push(action.payload); },
      },
    ),

    updateJournalEntry: create.asyncThunk(
      async (entry: JournalEntry) => {
        await new Promise(r => setTimeout(r, 300));
        const idx = entriesStore.findIndex(e => e.id === entry.id);
        if (idx !== -1) entriesStore[idx] = entry;
        return entry;
      },
      {
        fulfilled: (state, action) => {
          const idx = state.entries.findIndex(e => e.id === action.payload.id);
          if (idx !== -1) state.entries[idx] = action.payload;
        },
      },
    ),

    voidJournalEntry: create.asyncThunk(
      async (id: string) => {
        await new Promise(r => setTimeout(r, 300));
        const idx = entriesStore.findIndex(e => e.id === id);
        if (idx !== -1) {
          entriesStore[idx] = { ...entriesStore[idx], status: 'voided', updatedAt: new Date().toISOString() };
        }
        return entriesStore[idx];
      },
      {
        fulfilled: (state, action) => {
          const idx = state.entries.findIndex(e => e.id === action.payload.id);
          if (idx !== -1) state.entries[idx] = action.payload;
        },
      },
    ),

    postJournalEntry: create.asyncThunk(
      async (id: string) => {
        await new Promise(r => setTimeout(r, 300));
        const now = new Date().toISOString();
        const idx = entriesStore.findIndex(e => e.id === id);
        if (idx !== -1) {
          entriesStore[idx] = { ...entriesStore[idx], status: 'posted', postedAt: now, approvedBy: 'user-001', updatedAt: now };
        }
        return entriesStore[idx];
      },
      {
        fulfilled: (state, action) => {
          const idx = state.entries.findIndex(e => e.id === action.payload.id);
          if (idx !== -1) state.entries[idx] = action.payload;
        },
      },
    ),
  }),

  selectors: {
    selectJEEntries: state => state.entries,
    selectJESearchQuery: state => state.searchQuery,
    selectJEActiveFilter: state => state.activeFilter,
    selectJEIsLoading: state => state.isLoading,
    selectJEError: state => state.error,
  },
});

export const {
  setJESearchQuery,
  setJEActiveFilter,
  resetJEList,
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  voidJournalEntry,
  postJournalEntry,
} = jeListSlice.actions;

export const {
  selectJEEntries,
  selectJESearchQuery,
  selectJEActiveFilter,
  selectJEIsLoading,
  selectJEError,
} = jeListSlice.selectors;
