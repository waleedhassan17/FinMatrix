// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with InventoryDetailScreen.tsx
// Manages detail-screen UI state: active tab + the item's movement history.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { getStockMovementsAPI } from '../../../networks/inventory/inventoryNetwork';
import { stockMovementsSerializer } from '../../../serializers/inventorySerializer';
import type { StockMovement } from '../../../models/inventoryModel';

export type InventoryDetailTab = 'stock' | 'transactions';

export interface InventoryDetailSliceState {
  activeTab: InventoryDetailTab;
  movements: StockMovement[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string;
}

const initialState: InventoryDetailSliceState = {
  activeTab: 'stock',
  movements: [],
  status: 'idle',
  error: '',
};

export const inventoryDetailSlice = createAppSlice({
  name: 'inventoryDetail',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<InventoryDetailTab>) => {
      state.activeTab = action.payload;
    }),
    resetInventoryDetail: create.reducer(state => {
      state.activeTab = 'stock';
      state.movements = [];
      state.status = 'idle';
      state.error = '';
    }),

    // The inventory audit trail. Every stock movement the server recorded for
    // this item — receipts, adjustments, deliveries, sales, returns — which
    // the Transactions tab used to claim was always empty because the model
    // helper it read returned a hardcoded [].
    fetchItemMovements: create.asyncThunk(
      async (itemId: string) => getStockMovementsAPI(itemId),
      {
        pending: state => { state.status = 'loading'; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.movements = stockMovementsSerializer(action.payload);
          state.status = 'succeeded';
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = action.error?.message ?? 'Failed to load stock movements';
        },
      },
    ),
  }),

  selectors: {
    selectInventoryDetailTab: state => state.activeTab,
    selectInventoryDetailMovements: state => state.movements,
    selectInventoryDetailStatus: state => state.status,
    selectInventoryDetailError: state => state.error,
  },
});

export const {
  setActiveTab,
  resetInventoryDetail,
  fetchItemMovements,
} = inventoryDetailSlice.actions;

export const {
  selectInventoryDetailTab,
  selectInventoryDetailMovements,
  selectInventoryDetailStatus,
  selectInventoryDetailError,
} = inventoryDetailSlice.selectors;
