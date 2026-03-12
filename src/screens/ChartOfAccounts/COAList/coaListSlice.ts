// ═══════════════════════════════════════════════════════
// FinMatrix — COA List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with COAListScreen.tsx
// Owns all COA account data + CRUD thunks + list UI state.
// Other COA screens import data selectors/thunks from here.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Account, AccountType } from '../../../types';
import {
  getAccountsAPI,
  createAccountAPI,
  updateAccountAPI,
  toggleAccountAPI,
} from '../../../network/coaNetwork';

export type COAFilter = 'all' | AccountType;

export interface COAListSliceState {
  accounts: Account[];
  searchQuery: string;
  activeFilter: COAFilter;
  isLoading: boolean;
  error: string;
}

const initialState: COAListSliceState = {
  accounts: [],
  searchQuery: '',
  activeFilter: 'all',
  isLoading: false,
  error: '',
};

export const coaListSlice = createAppSlice({
  name: 'coaList',
  initialState,
  reducers: create => ({
    // ── Account data reducers ───────────────────────
    setAccounts: create.reducer((state, action: PayloadAction<Account[]>) => {
      state.accounts = action.payload;
    }),
    addAccount: create.reducer((state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload);
    }),
    updateAccount: create.reducer((state, action: PayloadAction<Account>) => {
      const idx = state.accounts.findIndex(a => a.id === action.payload.id);
      if (idx !== -1) state.accounts[idx] = action.payload;
    }),
    toggleAccountActive: create.reducer((state, action: PayloadAction<string>) => {
      const idx = state.accounts.findIndex(a => a.id === action.payload);
      if (idx !== -1) state.accounts[idx].isActive = !state.accounts[idx].isActive;
    }),

    // ── List UI reducers ────────────────────────────
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setActiveFilter: create.reducer((state, action: PayloadAction<COAFilter>) => {
      state.activeFilter = action.payload;
    }),
    resetCoaList: create.reducer(state => {
      state.searchQuery = '';
      state.activeFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchAccounts: create.asyncThunk(
      async () => getAccountsAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.accounts = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch accounts';
        },
      },
    ),
    createAccount: create.asyncThunk(
      async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => createAccountAPI(data),
      {
        fulfilled: (state, action) => {
          state.accounts.push(action.payload);
        },
      },
    ),
    editAccount: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<Account> }) => updateAccountAPI(id, data),
      {
        fulfilled: (state, action) => {
          const idx = state.accounts.findIndex(a => a.id === action.payload.id);
          if (idx !== -1) state.accounts[idx] = action.payload;
        },
      },
    ),
    toggleAccount: create.asyncThunk(
      async (id: string) => toggleAccountAPI(id),
      {
        fulfilled: (state, action) => {
          const idx = state.accounts.findIndex(a => a.id === action.payload.id);
          if (idx !== -1) state.accounts[idx] = action.payload;
        },
      },
    ),
  }),

  selectors: {
    selectAccounts: state => state.accounts,
    selectSearchQuery: state => state.searchQuery,
    selectActiveFilter: state => state.activeFilter,
    selectIsLoading: state => state.isLoading,
    selectCOAError: state => state.error,
  },
});

export const {
  setAccounts,
  addAccount,
  updateAccount,
  toggleAccountActive,
  setSearchQuery,
  setActiveFilter,
  resetCoaList,
  fetchAccounts,
  createAccount,
  editAccount,
  toggleAccount,
} = coaListSlice.actions;

export const {
  selectAccounts,
  selectSearchQuery,
  selectActiveFilter,
  selectIsLoading,
  selectCOAError,
} = coaListSlice.selectors;
