// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export type VendorDetailTab = 'overview' | 'bills' | 'payments';

export interface VendorDetailSliceState {
  activeTab: VendorDetailTab;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: VendorDetailSliceState = {
  activeTab: 'overview',
  status: 'idle',
  error: '',
};

export const vendorDetailSlice = createAppSlice({
  name: 'vendorDetail',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<VendorDetailTab>) => {
      state.activeTab = action.payload;
    }),
    resetVendorDetail: create.reducer(state => {
      state.activeTab = 'overview';
      state.status = 'idle';
      state.error = '';
    }),
  }),

  selectors: {
    selectVendorDetailTab: state => state.activeTab,
    selectVendorDetailStatus: state => state.status,
  },
});

export const {
  setActiveTab,
  resetVendorDetail,
} = vendorDetailSlice.actions;

export const {
  selectVendorDetailTab,
  selectVendorDetailStatus,
} = vendorDetailSlice.selectors;
