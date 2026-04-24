// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder, SalesOrderStatus } from '../../../types';
import { getSalesOrdersAPI, deleteSalesOrderAPI } from '../../../network/salesOrderNetwork';
import {
  salesOrderListSerializer,
  salesOrderSingleSerializer,
} from '../../../serializers/salesOrderSerializer';

export type SOStatusFilter = 'all' | SalesOrderStatus;

export interface SOListSliceState {
  salesOrders: SalesOrder[];
  searchQuery: string;
  statusFilter: SOStatusFilter;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalSalesOrders: number;
}

const initialState: SOListSliceState = {
  salesOrders: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalSalesOrders: 0,
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
      state.page = 1;
      state.totalPages = 1;
      state.totalSalesOrders = 0;
    }),
    // Upsert a single sales order — used after an action without refetching the whole list.
    upsertSalesOrder: create.reducer((state, action: PayloadAction<SalesOrder>) => {
      const idx = state.salesOrders.findIndex(s => s.id === action.payload.id);
      if (idx === -1) state.salesOrders.push(action.payload);
      else state.salesOrders[idx] = action.payload;
    }),

    fetchSalesOrders: create.asyncThunk(
      async () => getSalesOrdersAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = salesOrderListSerializer(action.payload);
          state.salesOrders = data.salesOrders;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalSalesOrders = data.totalSalesOrders;
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

// Exported for consumers who want to apply the serializer locally
export { salesOrderSingleSerializer };

export const {
  setSalesOrders,
  setSOSearchQuery,
  setSOStatusFilter,
  resetSOList,
  upsertSalesOrder,
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
