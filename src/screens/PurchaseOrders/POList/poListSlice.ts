// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with POListScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors `billListSlice.ts`.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types';
import {
  getPurchaseOrdersAPI,
  deletePurchaseOrderAPI,
} from '../../../network/purchaseOrderNetwork';
import {
  purchaseOrderListSerializer,
} from '../../../serializers/purchaseOrderSerializer';

export type POStatusFilter = 'all' | PurchaseOrderStatus;

export interface POListSliceState {
  items: PurchaseOrder[];
  searchQuery: string;
  statusFilter: POStatusFilter;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalPOs: number;
  counts: Record<'all' | PurchaseOrderStatus, number>;
  totalValue: number;
}

const initialState: POListSliceState = {
  items: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalPOs: 0,
  counts: { all: 0, draft: 0, sent: 0, partially_received: 0, fully_received: 0, closed: 0 },
  totalValue: 0,
};

export const poListSlice = createAppSlice({
  name: 'poList',
  initialState,
  reducers: create => ({
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<POStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    /** Upsert a single PO — used after create/edit/status-change without
     *  refetching the whole list. */
    upsertPurchaseOrder: create.reducer((state, action: PayloadAction<PurchaseOrder>) => {
      const idx = state.items.findIndex(p => p.id === action.payload.id);
      if (idx === -1) state.items.unshift(action.payload);
      else state.items[idx] = action.payload;
    }),
    resetPOList: create.reducer(state => {
      Object.assign(state, initialState);
    }),

    // ── Async thunks ────────────────────────────────
    fetchPurchaseOrders: create.asyncThunk(
      async (_arg, thunkAPI) => {
        const root = thunkAPI.getState() as { poList: POListSliceState };
        const { searchQuery, statusFilter } = root.poList;
        return getPurchaseOrdersAPI({
          ...(searchQuery ? { search: searchQuery } : {}),
          status: statusFilter,
        });
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = purchaseOrderListSerializer(action.payload);
          state.items = data.purchaseOrders;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalPOs = data.totalPOs;
          state.counts = data.counts;
          state.totalValue = data.totalValue;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load purchase orders';
        },
      },
    ),

    removePurchaseOrder: create.asyncThunk(
      async (poId: string) => {
        await deletePurchaseOrderAPI(poId);
        return poId;
      },
      {
        fulfilled: (state, action) => {
          state.items = state.items.filter(p => p.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectItems: s => s.items,
    selectSearchQuery: s => s.searchQuery,
    selectStatusFilter: s => s.statusFilter,
    selectIsLoading: s => s.isLoading,
    selectError: s => s.error,
    selectCounts: s => s.counts,
    selectListTotals: s => ({
      totalValue: s.totalValue,
      totalPOs: s.totalPOs,
    }),
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  upsertPurchaseOrder,
  resetPOList,
  fetchPurchaseOrders,
  removePurchaseOrder,
} = poListSlice.actions;

export const {
  selectItems,
  selectSearchQuery,
  selectStatusFilter,
  selectIsLoading,
  selectError,
  selectCounts,
  selectListTotals,
} = poListSlice.selectors;
