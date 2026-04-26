// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Detail Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Owns:
//   • UI tab state (overview / bills / payments)
//   • Detail fetch (single vendor) — flows through serializer
//   • Toggle-active action — flows through serializer
// Mirrors the GL slice architecture.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Vendor } from '../../../types';
import {
  getVendorByIdAPI,
  toggleVendorActiveAPI,
} from '../../../network/vendorNetwork';
import { vendorSingleSerializer } from '../../../serializers/vendorSerializer';

export type VendorDetailTab = 'overview' | 'bills' | 'payments';

export interface VendorDetailSliceState {
  activeTab: VendorDetailTab;
  vendor: Vendor | null;
  status: 'idle' | 'loading' | 'failed';
  error: string;
  isToggling: boolean;
}

const initialState: VendorDetailSliceState = {
  activeTab: 'overview',
  vendor: null,
  status: 'idle',
  error: '',
  isToggling: false,
};

export const vendorDetailSlice = createAppSlice({
  name: 'vendorDetail',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<VendorDetailTab>) => {
      state.activeTab = action.payload;
    }),
    setVendorDetail: create.reducer((state, action: PayloadAction<Vendor | null>) => {
      state.vendor = action.payload;
    }),
    resetVendorDetail: create.reducer(state => {
      state.activeTab = 'overview';
      state.vendor = null;
      state.status = 'idle';
      state.error = '';
      state.isToggling = false;
    }),

    fetchVendorDetail: create.asyncThunk(
      async (id: string) => getVendorByIdAPI(id),
      {
        pending: state => { state.status = 'loading'; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.vendor = vendorSingleSerializer(action.payload);
          state.status = 'idle';
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = action.error?.message ?? 'Failed to load vendor';
        },
      },
    ),

    toggleActiveOnDetail: create.asyncThunk(
      async (id: string) => toggleVendorActiveAPI(id),
      {
        pending: state => { state.isToggling = true; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const v = vendorSingleSerializer(action.payload);
          if (v) state.vendor = v;
          state.isToggling = false;
        },
        rejected: state => { state.isToggling = false; },
      },
    ),
  }),

  selectors: {
    selectVendorDetailTab: state => state.activeTab,
    selectVendorDetailStatus: state => state.status,
    selectVendorDetail: state => state.vendor,
    selectVendorDetailError: state => state.error,
    selectVendorDetailIsToggling: state => state.isToggling,
  },
});

export const {
  setActiveTab,
  setVendorDetail,
  resetVendorDetail,
  fetchVendorDetail,
  toggleActiveOnDetail,
} = vendorDetailSlice.actions;

export const {
  selectVendorDetailTab,
  selectVendorDetailStatus,
  selectVendorDetail,
  selectVendorDetailError,
  selectVendorDetailIsToggling,
} = vendorDetailSlice.selectors;
