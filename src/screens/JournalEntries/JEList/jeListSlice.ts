// ═══════════════════════════════════════════════════════
// FinMatrix — JE List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with JEListScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { JournalEntry, JournalEntryStatus } from '../../../types';
import {
  getJournalEntriesAPI,
  createJournalEntryAPI,
  updateJournalEntryAPI,
  voidJournalEntryAPI,
  postJournalEntryAPI,
} from '../../../network/jeNetwork';
import {
  jeListSerializer,
  jeSingleSerializer,
  toJEApiEntry,
} from '../../../serializers/jeSerializer';

export type JEFilter = 'all' | JournalEntryStatus;

export interface JEListSliceState {
  entries: JournalEntry[];
  searchQuery: string;
  activeFilter: JEFilter;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalEntries: number;
}

const initialState: JEListSliceState = {
  entries: [],
  searchQuery: '',
  activeFilter: 'all',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalEntries: 0,
};

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
      async () => getJournalEntriesAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = jeListSerializer(action.payload);
          state.entries = data.entries;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalEntries = data.totalEntries;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch entries';
        },
      },
    ),

    createJournalEntry: create.asyncThunk(
      async (entry: JournalEntry) => createJournalEntryAPI(toJEApiEntry(entry)),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const entry = jeSingleSerializer(action.payload);
          if (entry) state.entries.push(entry);
        },
      },
    ),

    updateJournalEntry: create.asyncThunk(
      async (entry: JournalEntry) => updateJournalEntryAPI(toJEApiEntry(entry)),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const entry = jeSingleSerializer(action.payload);
          if (!entry) return;
          const idx = state.entries.findIndex(e => e.id === entry.id);
          if (idx !== -1) state.entries[idx] = entry;
        },
      },
    ),

    voidJournalEntry: create.asyncThunk(
      async (id: string) => voidJournalEntryAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const entry = jeSingleSerializer(action.payload);
          if (!entry) return;
          const idx = state.entries.findIndex(e => e.id === entry.id);
          if (idx !== -1) state.entries[idx] = entry;
        },
      },
    ),

    postJournalEntry: create.asyncThunk(
      async (id: string) => postJournalEntryAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const entry = jeSingleSerializer(action.payload);
          if (!entry) return;
          const idx = state.entries.findIndex(e => e.id === entry.id);
          if (idx !== -1) state.entries[idx] = entry;
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
