// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order List Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder, SalesOrderStatus } from '../../../types';
import { getSalesOrdersAPI, deleteSalesOrderAPI } from '../../../network/salesOrderNetwork';

export type SOStatusFilter = 'all' | SalesOrderStatus;

export interface SOListSliceState {
  salesOrders: SalesOrder[];
  searchQuery: string;
  statusFilter: SOStatusFilter;
  isLoading: boolean;
  error: string;
}

const initialState: SOListSliceState = {
  salesOrders: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
};

export const soListSlice = createAppSlice({
  name: 'soList',
  initialState,
  reducers: create => ({
    setSalesOrders: create.reducer((state, action: PayloadAction<SalesOrder[]>) => {
      state.salesOrders = action.payload;
    }),
    setSOSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setSOStatusFilter: create.reducer((state, action: PayloadAction<SOStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    resetSOList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    fetchSalesOrders: create.asyncThunk(
      async () => getSalesOrdersAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.salesOrders = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch sales orders';
        },
      },
    ),
    removeSalesOrder: create.asyncThunk(
      async (id: string) => {
        await deleteSalesOrderAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.salesOrders = state.salesOrders.filter(s => s.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectSalesOrders: state => state.salesOrders,
    selectSOSearchQuery: state => state.searchQuery,
    selectSOStatusFilter: state => state.statusFilter,
    selectSOIsLoading: state => state.isLoading,
    selectSOError: state => state.error,
  },
});

export const {
  setSalesOrders,
  setSOSearchQuery,
  setSOStatusFilter,
  resetSOList,
  fetchSalesOrders,
  removeSalesOrder,
} = soListSlice.actions;

export const {
  selectSalesOrders,
  selectSOSearchQuery,
  selectSOStatusFilter,
  selectSOIsLoading,
  selectSOError,
} = soListSlice.selectors;
