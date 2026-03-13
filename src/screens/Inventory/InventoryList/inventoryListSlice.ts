// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with InventoryListScreen.tsx
// Owns all inventory item data + CRUD thunks + list UI state.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { InventoryItemData } from '../../../dummy-data/inventoryItems';
import {
  getInventoryItemsAPI,
  createInventoryItemAPI,
  updateInventoryItemAPI,
  adjustStockAPI,
  toggleInventoryItemAPI,
} from '../../../network/inventoryNetwork';

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type ViewMode = 'list' | 'grid';

export interface InventoryListSliceState {
  items: InventoryItemData[];
  searchQuery: string;
  activeFilter: StockFilter;
  categoryFilter: string;
  agencyFilter: string;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string;
}

const initialState: InventoryListSliceState = {
  items: [],
  searchQuery: '',
  activeFilter: 'all',
  categoryFilter: 'all',
  agencyFilter: 'all',
  viewMode: 'list',
  isLoading: false,
  error: '',
};

export const inventoryListSlice = createAppSlice({
  name: 'inventoryList',
  initialState,
  reducers: create => ({
    // ── Item data reducers ──────────────────────────
    setItems: create.reducer((state, action: PayloadAction<InventoryItemData[]>) => {
      state.items = action.payload;
    }),
    addItem: create.reducer((state, action: PayloadAction<InventoryItemData>) => {
      state.items.push(action.payload);
    }),
    updateItem: create.reducer((state, action: PayloadAction<InventoryItemData>) => {
      const idx = state.items.findIndex(i => i.itemId === action.payload.itemId);
      if (idx !== -1) state.items[idx] = action.payload;
    }),

    // ── List UI reducers ────────────────────────────
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setActiveFilter: create.reducer((state, action: PayloadAction<StockFilter>) => {
      state.activeFilter = action.payload;
    }),
    setCategoryFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.categoryFilter = action.payload;
    }),
    setAgencyFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.agencyFilter = action.payload;
    }),
    setViewMode: create.reducer((state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    }),
    resetInventoryList: create.reducer(state => {
      state.searchQuery = '';
      state.activeFilter = 'all';
      state.categoryFilter = 'all';
      state.agencyFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchInventoryItems: create.asyncThunk(
      async () => getInventoryItemsAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.items = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch inventory';
        },
      },
    ),
    createInventoryItem: create.asyncThunk(
      async (data: Omit<InventoryItemData, 'itemId' | 'lastUpdated'>) => createInventoryItemAPI(data),
      {
        fulfilled: (state, action) => {
          state.items.push(action.payload);
        },
      },
    ),
    editInventoryItem: create.asyncThunk(
      async ({ itemId, data }: { itemId: string; data: Partial<InventoryItemData> }) =>
        updateInventoryItemAPI(itemId, data),
      {
        fulfilled: (state, action) => {
          const idx = state.items.findIndex(i => i.itemId === action.payload.itemId);
          if (idx !== -1) state.items[idx] = action.payload;
        },
      },
    ),
    adjustStock: create.asyncThunk(
      async ({ itemId, quantityChange }: { itemId: string; quantityChange: number }) =>
        adjustStockAPI(itemId, quantityChange),
      {
        fulfilled: (state, action) => {
          const idx = state.items.findIndex(i => i.itemId === action.payload.itemId);
          if (idx !== -1) state.items[idx] = action.payload;
        },
      },
    ),
    toggleInventoryItem: create.asyncThunk(
      async (itemId: string) => toggleInventoryItemAPI(itemId),
      {
        fulfilled: (state, action) => {
          const idx = state.items.findIndex(i => i.itemId === action.payload.itemId);
          if (idx !== -1) state.items[idx] = action.payload;
        },
      },
    ),
  }),

  selectors: {
    selectInventoryItems: state => state.items,
    selectInventorySearchQuery: state => state.searchQuery,
    selectInventoryActiveFilter: state => state.activeFilter,
    selectInventoryCategoryFilter: state => state.categoryFilter,
    selectInventoryAgencyFilter: state => state.agencyFilter,
    selectInventoryViewMode: state => state.viewMode,
    selectInventoryIsLoading: state => state.isLoading,
    selectInventoryError: state => state.error,
  },
});

export const {
  setItems,
  addItem,
  updateItem,
  setSearchQuery,
  setActiveFilter,
  setCategoryFilter,
  setAgencyFilter,
  setViewMode,
  resetInventoryList,
  fetchInventoryItems,
  createInventoryItem,
  editInventoryItem,
  adjustStock,
  toggleInventoryItem,
} = inventoryListSlice.actions;

export const {
  selectInventoryItems,
  selectInventorySearchQuery,
  selectInventoryActiveFilter,
  selectInventoryCategoryFilter,
  selectInventoryAgencyFilter,
  selectInventoryViewMode,
  selectInventoryIsLoading,
  selectInventoryError,
} = inventoryListSlice.selectors;
