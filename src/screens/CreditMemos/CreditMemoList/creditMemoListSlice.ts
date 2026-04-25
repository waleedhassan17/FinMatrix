// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors the GL slice architecture.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { CreditMemo, CreditMemoStatus } from '../../../types';
import {
  getCreditMemosAPI,
  deleteCreditMemoAPI,
} from '../../../network/creditMemoNetwork';
import { creditMemoListSerializer } from '../../../serializers/creditMemoSerializer';

export type CreditMemoStatusFilter = 'all' | CreditMemoStatus;

export interface CreditMemoListSliceState {
  creditMemos: CreditMemo[];
  searchQuery: string;
  statusFilter: CreditMemoStatusFilter;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalCreditMemos: number;
}

const initialState: CreditMemoListSliceState = {
  creditMemos: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalCreditMemos: 0,
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
    /** Upsert a single memo — used after create/apply/refund without
     *  refetching the whole list. */
    upsertCreditMemo: create.reducer((state, action: PayloadAction<CreditMemo>) => {
      const idx = state.creditMemos.findIndex(c => c.id === action.payload.id);
      if (idx === -1) state.creditMemos.unshift(action.payload);
      else state.creditMemos[idx] = action.payload;
    }),
    resetCreditMemoList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.isLoading = false;
      state.error = '';
      state.page = 1;
      state.totalPages = 1;
      state.totalCreditMemos = 0;
    }),

    fetchCreditMemos: create.asyncThunk(
      async () => getCreditMemosAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = creditMemoListSerializer(action.payload);
          state.creditMemos = data.creditMemos;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalCreditMemos = data.totalCreditMemos;
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
  upsertCreditMemo,
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
