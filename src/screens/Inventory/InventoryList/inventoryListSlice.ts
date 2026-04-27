// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with InventoryListScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors `glSlice.ts` / `billListSlice.ts`.

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
import {
  inventoryListSerializer,
  inventorySingleSerializer,
} from '../../../serializers/inventorySerializer';

export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type ViewMode = 'list' | 'grid';

export interface DeliveryQuantityChange {
  itemId: string;
  deliveredQty: number;
  returnedQty: number;
}

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
    applyDeliveryChanges: create.reducer((state, action: PayloadAction<{ changes: DeliveryQuantityChange[] }>) => {
      const now = new Date().toISOString();
      action.payload.changes.forEach(change => {
        const idx = state.items.findIndex(i => i.itemId === change.itemId);
        if (idx === -1) return;
        const current = state.items[idx].quantityOnHand;
        const next = Math.max(0, current - change.deliveredQty + change.returnedQty);
        state.items[idx].quantityOnHand = next;
        state.items[idx].lastUpdated = now;
      });
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

    // ── Async thunks (route through network → serializer) ──
    fetchInventoryItems: create.asyncThunk(
      async () => getInventoryItemsAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const serialized = inventoryListSerializer(action.payload);
          state.items = serialized.items;
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
        fulfilled: (state, action: PayloadAction<any>) => {
          const item = inventorySingleSerializer(action.payload);
          if (item) state.items.push(item);
        },
      },
    ),
    editInventoryItem: create.asyncThunk(
      async ({ itemId, data }: { itemId: string; data: Partial<InventoryItemData> }) =>
        updateInventoryItemAPI(itemId, data),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const item = inventorySingleSerializer(action.payload);
          if (!item) return;
          const idx = state.items.findIndex(i => i.itemId === item.itemId);
          if (idx !== -1) state.items[idx] = item;
        },
      },
    ),
    adjustStock: create.asyncThunk(
      async ({ itemId, quantityChange }: { itemId: string; quantityChange: number }) =>
        adjustStockAPI(itemId, quantityChange),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const item = inventorySingleSerializer(action.payload);
          if (!item) return;
          const idx = state.items.findIndex(i => i.itemId === item.itemId);
          if (idx !== -1) state.items[idx] = item;
        },
      },
    ),
    toggleInventoryItem: create.asyncThunk(
      async (itemId: string) => toggleInventoryItemAPI(itemId),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const item = inventorySingleSerializer(action.payload);
          if (!item) return;
          const idx = state.items.findIndex(i => i.itemId === item.itemId);
          if (idx !== -1) state.items[idx] = item;
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
  applyDeliveryChanges,
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
