// ═══════════════════════════════════════════════════════
// FinMatrix — Reconciliation History Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BankReconciliation } from '../../../types';
import { getReconciliationHistoryAPI } from '../../../network/bankingNetwork';

export interface ReconciliationHistoryState {
  history: BankReconciliation[];
  accountFilter: string;
  isLoading: boolean;
  error: string;
}

const initialState: ReconciliationHistoryState = {
  history: [],
  accountFilter: '',
  isLoading: false,
  error: '',
};

export const reconciliationHistorySlice = createAppSlice({
  name: 'reconciliationHistory',
  initialState,
  reducers: create => ({
    setReconciliationHistoryAccountFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.accountFilter = action.payload;
    }),

    fetchReconciliationHistory: create.asyncThunk(
      async (accountId?: string) => getReconciliationHistoryAPI(accountId),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.history = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch reconciliation history';
        },
      },
    ),
  }),
  selectors: {
    selectReconciliationHistory: state => state.history,
    selectReconciliationHistoryAccountFilter: state => state.accountFilter,
    selectReconciliationHistoryIsLoading: state => state.isLoading,
    selectReconciliationHistoryError: state => state.error,
  },
});

export const {
  setReconciliationHistoryAccountFilter,
  fetchReconciliationHistory,
} = reconciliationHistorySlice.actions;

export const {
  selectReconciliationHistory,
  selectReconciliationHistoryAccountFilter,
  selectReconciliationHistoryIsLoading,
  selectReconciliationHistoryError,
} = reconciliationHistorySlice.selectors;
