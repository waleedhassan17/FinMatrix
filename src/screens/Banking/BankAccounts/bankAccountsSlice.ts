// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Accounts Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BankAccount } from '../../../types';
import { getBankAccountsAPI } from '../../../network/bankingNetwork';
import { bankAccountListSerializer } from '../../../serializers/bankingSerializer';

export interface BankAccountsState {
  accounts: BankAccount[];
  selectedAccountId: string;
  isLoading: boolean;
  error: string;
}

const initialState: BankAccountsState = {
  accounts: [],
  selectedAccountId: '',
  isLoading: false,
  error: '',
};

export const bankAccountsSlice = createAppSlice({
  name: 'bankAccounts',
  initialState,
  reducers: create => ({
    setSelectedBankAccount: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedAccountId = action.payload;
    }),

    fetchBankAccounts: create.asyncThunk(
      async () => {
        const envelope = await getBankAccountsAPI();
        return bankAccountListSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.accounts = action.payload;
          if (!state.selectedAccountId && action.payload.length > 0) {
            state.selectedAccountId = action.payload[0].id;
          }
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch bank accounts';
        },
      },
    ),
  }),
  selectors: {
    selectBankAccounts: state => state.accounts,
    selectSelectedBankAccountId: state => state.selectedAccountId,
    selectBankAccountsIsLoading: state => state.isLoading,
    selectBankAccountsError: state => state.error,
    selectSelectedBankAccount: state =>
      state.accounts.find(a => a.id === state.selectedAccountId) ?? null,
  },
});

export const {
  setSelectedBankAccount,
  fetchBankAccounts,
} = bankAccountsSlice.actions;

export const {
  selectBankAccounts,
  selectSelectedBankAccountId,
  selectBankAccountsIsLoading,
  selectBankAccountsError,
  selectSelectedBankAccount,
} = bankAccountsSlice.selectors;
