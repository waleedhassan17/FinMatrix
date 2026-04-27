// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Register Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BankTransaction } from '../../../types';
import { getBankTransactionsAPI } from '../../../network/bankingNetwork';
import { bankTransactionListSerializer } from '../../../serializers/bankingSerializer';

export interface BankRegisterDateRange {
  fromDate: string;
  toDate: string;
}

export interface BankRegisterState {
  transactions: BankTransaction[];
  searchQuery: string;
  dateRange: BankRegisterDateRange;
  isLoading: boolean;
  error: string;
}

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

const initialState: BankRegisterState = {
  transactions: [],
  searchQuery: '',
  dateRange: {
    fromDate: startOfMonth,
    toDate: endOfMonth,
  },
  isLoading: false,
  error: '',
};

export const getSignedTransactionAmount = (tx: BankTransaction): number => {
  if (tx.type === 'deposit' || tx.type === 'interest' || tx.type === 'card_payment') return tx.amount;
  if (tx.type === 'withdrawal' || tx.type === 'fee' || tx.type === 'card_charge') return -tx.amount;
  if (tx.type === 'transfer') {
    const fromDirection = /transfer to/i.test(tx.description);
    return fromDirection ? -tx.amount : tx.amount;
  }
  return 0;
};

export const bankRegisterSlice = createAppSlice({
  name: 'bankRegister',
  initialState,
  reducers: create => ({
    setBankRegisterSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setBankRegisterDateRange: create.reducer((state, action: PayloadAction<BankRegisterDateRange>) => {
      state.dateRange = action.payload;
    }),
    resetBankRegisterFilters: create.reducer(state => {
      state.searchQuery = '';
      state.dateRange = { fromDate: startOfMonth, toDate: endOfMonth };
    }),

    fetchBankRegisterTransactions: create.asyncThunk(
      async (accountId: string) => {
        const envelope = await getBankTransactionsAPI(accountId);
        return bankTransactionListSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.transactions = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch bank register';
        },
      },
    ),
  }),
  selectors: {
    selectBankRegisterTransactions: state => state.transactions,
    selectBankRegisterSearchQuery: state => state.searchQuery,
    selectBankRegisterDateRange: state => state.dateRange,
    selectBankRegisterIsLoading: state => state.isLoading,
    selectBankRegisterError: state => state.error,
    selectFilteredBankRegisterTransactions: createSelector(
      [
        (state: BankRegisterState) => state.transactions,
        (state: BankRegisterState) => state.dateRange,
        (state: BankRegisterState) => state.searchQuery,
      ],
      (transactions, dateRange, searchQuery) => {
        const from = dateRange.fromDate.slice(0, 10);
        const to = dateRange.toDate.slice(0, 10);
        const q = searchQuery.trim().toLowerCase();
        return transactions.filter(tx => {
          const day = tx.date.slice(0, 10);
          if (day < from || day > to) return false;
          if (!q) return true;
          return (
            tx.payee.toLowerCase().includes(q) ||
            tx.description.toLowerCase().includes(q) ||
            tx.reference.toLowerCase().includes(q)
          );
        });
      },
    ),
    selectBankRegisterTotals: createSelector(
      [
        (state: BankRegisterState) => state.transactions,
        (state: BankRegisterState) => state.dateRange,
        (state: BankRegisterState) => state.searchQuery,
      ],
      (transactions, dateRange, searchQuery) => {
        const from = dateRange.fromDate.slice(0, 10);
        const to = dateRange.toDate.slice(0, 10);
        const q = searchQuery.trim().toLowerCase();
        const filtered = transactions.filter(tx => {
          const day = tx.date.slice(0, 10);
          if (day < from || day > to) return false;
          if (!q) return true;
          return (
            tx.payee.toLowerCase().includes(q) ||
            tx.description.toLowerCase().includes(q) ||
            tx.reference.toLowerCase().includes(q)
          );
        });

        const totals = filtered.reduce(
          (acc, tx) => {
            const signed = getSignedTransactionAmount(tx);
            if (signed >= 0) acc.deposits += signed;
            if (signed < 0) acc.payments += Math.abs(signed);
            return acc;
          },
          { deposits: 0, payments: 0 },
        );

        return {
          ...totals,
          net: totals.deposits - totals.payments,
        };
      },
    ),
  },
});

export const {
  setBankRegisterSearchQuery,
  setBankRegisterDateRange,
  resetBankRegisterFilters,
  fetchBankRegisterTransactions,
} = bankRegisterSlice.actions;

export const {
  selectBankRegisterTransactions,
  selectBankRegisterSearchQuery,
  selectBankRegisterDateRange,
  selectBankRegisterIsLoading,
  selectBankRegisterError,
  selectFilteredBankRegisterTransactions,
  selectBankRegisterTotals,
} = bankRegisterSlice.selectors;
