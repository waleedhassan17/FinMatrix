// ═══════════════════════════════════════════════════════
// FinMatrix — PO List Slice
// ═══════════════════════════════════════════════════════

import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types';
import { createAppSlice } from '../../../store/createAppSlice';
import {
  getPurchaseOrdersAPI,
  deletePurchaseOrderAPI,
} from '../../../network/purchaseOrderNetwork';

type StatusFilter = PurchaseOrderStatus | 'all';

interface POListState {
  items: PurchaseOrder[];
  searchQuery: string;
  statusFilter: StatusFilter;
  isLoading: boolean;
  error: string | null;
}

const initialState: POListState = {
  items: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: null,
};

export const poListSlice = createAppSlice({
  name: 'poList',
  initialState,
  reducers: create => ({
    setSearchQuery: create.reducer<string>((state, action) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer<StatusFilter>((state, action) => {
      state.statusFilter = action.payload;
    }),
    fetchPurchaseOrders: create.asyncThunk(
      async () => getPurchaseOrdersAPI(),
      {
        pending: state => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.items = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load purchase orders';
        },
      },
    ),
    removePurchaseOrder: create.asyncThunk(
      async (id: string) => {
        await deletePurchaseOrderAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.items = state.items.filter(po => po.id !== action.payload);
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
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  fetchPurchaseOrders,
  removePurchaseOrder,
} = poListSlice.actions;

export const {
  selectItems,
  selectSearchQuery,
  selectStatusFilter,
  selectIsLoading,
  selectError,
} = poListSlice.selectors;
