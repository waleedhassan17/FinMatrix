// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with InventoryDetailScreen.tsx
// Manages detail-screen UI state: active tab.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export type InventoryDetailTab = 'stock' | 'transactions' | 'locations';

export interface InventoryDetailSliceState {
  activeTab: InventoryDetailTab;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: InventoryDetailSliceState = {
  activeTab: 'stock',
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
      state.status = 'idle';
      state.error = '';
    }),
  }),

  selectors: {
    selectInventoryDetailTab: state => state.activeTab,
    selectInventoryDetailStatus: state => state.status,
    selectInventoryDetailError: state => state.error,
  },
});

export const { setActiveTab, resetInventoryDetail } = inventoryDetailSlice.actions;

export const {
  selectInventoryDetailTab,
  selectInventoryDetailStatus,
  selectInventoryDetailError,
} = inventoryDetailSlice.selectors;
