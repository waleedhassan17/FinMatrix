// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { CreditMemo, CreditMemoStatus } from '../../../types';
import { getCreditMemosAPI, deleteCreditMemoAPI } from '../../../network/creditMemoNetwork';

export type CreditMemoStatusFilter = 'all' | CreditMemoStatus;

export interface CreditMemoListSliceState {
  creditMemos: CreditMemo[];
  searchQuery: string;
  statusFilter: CreditMemoStatusFilter;
  isLoading: boolean;
  error: string;
}

const initialState: CreditMemoListSliceState = {
  creditMemos: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
};

export const creditMemoListSlice = createAppSlice({
  name: 'creditMemoList',
  initialState,
  reducers: create => ({
    setCreditMemos: create.reducer((state, action: PayloadAction<CreditMemo[]>) => {
      state.creditMemos = action.payload;
    }),
    setCMSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setCMStatusFilter: create.reducer((state, action: PayloadAction<CreditMemoStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    resetCreditMemoList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    fetchCreditMemos: create.asyncThunk(
      async () => getCreditMemosAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.creditMemos = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch credit memos';
        },
      },
    ),
    removeCreditMemo: create.asyncThunk(
      async (id: string) => {
        await deleteCreditMemoAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.creditMemos = state.creditMemos.filter(c => c.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectCreditMemos: state => state.creditMemos,
    selectCMSearchQuery: state => state.searchQuery,
    selectCMStatusFilter: state => state.statusFilter,
    selectCMIsLoading: state => state.isLoading,
    selectCMError: state => state.error,
  },
});

export const {
  setCreditMemos,
  setCMSearchQuery,
  setCMStatusFilter,
  resetCreditMemoList,
  fetchCreditMemos,
  removeCreditMemo,
} = creditMemoListSlice.actions;

export const {
  selectCreditMemos,
  selectCMSearchQuery,
  selectCMStatusFilter,
  selectCMIsLoading,
  selectCMError,
} = creditMemoListSlice.selectors;
