// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Vendor } from '../../../types';
import {
  getVendorsAPI,
  createVendorAPI,
  updateVendorAPI,
  deleteVendorAPI,
  toggleVendorActiveAPI,
} from '../../../network/vendorNetwork';

export type VendorStatusFilter = 'all' | 'active' | 'inactive';
export type VendorSortField = 'name' | 'balance' | 'recent';

export interface VendorListSliceState {
  vendors: Vendor[];
  searchQuery: string;
  statusFilter: VendorStatusFilter;
  sortField: VendorSortField;
  isLoading: boolean;
  error: string;
}

const initialState: VendorListSliceState = {
  vendors: [],
  searchQuery: '',
  statusFilter: 'all',
  sortField: 'name',
  isLoading: false,
  error: '',
};

export const vendorListSlice = createAppSlice({
  name: 'vendorList',
  initialState,
  reducers: create => ({
    setVendors: create.reducer((state, action: PayloadAction<Vendor[]>) => {
      state.vendors = action.payload;
    }),
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<VendorStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    setSortField: create.reducer((state, action: PayloadAction<VendorSortField>) => {
      state.sortField = action.payload;
    }),
    resetVendorList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.sortField = 'name';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchVendors: create.asyncThunk(
      async () => getVendorsAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.vendors = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch vendors';
        },
      },
    ),
    createVendor: create.asyncThunk(
      async (data: Omit<Vendor, 'id' | 'balance' | 'createdAt' | 'updatedAt'>) =>
        createVendorAPI(data),
      {
        fulfilled: (state, action) => {
          state.vendors.push(action.payload);
        },
      },
    ),
    editVendor: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<Vendor> }) =>
        updateVendorAPI(id, data),
      {
        fulfilled: (state, action) => {
          const idx = state.vendors.findIndex(v => v.id === action.payload.id);
          if (idx !== -1) state.vendors[idx] = action.payload;
        },
      },
    ),
    removeVendor: create.asyncThunk(
      async (id: string) => {
        await deleteVendorAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.vendors = state.vendors.filter(v => v.id !== action.payload);
        },
      },
    ),
    toggleVendorActive: create.asyncThunk(
      async (id: string) => toggleVendorActiveAPI(id),
      {
        fulfilled: (state, action) => {
          const idx = state.vendors.findIndex(v => v.id === action.payload.id);
          if (idx !== -1) state.vendors[idx] = action.payload;
        },
      },
    ),
  }),

  selectors: {
    selectVendors: state => state.vendors,
    selectVendorSearchQuery: state => state.searchQuery,
    selectVendorStatusFilter: state => state.statusFilter,
    selectVendorSortField: state => state.sortField,
    selectVendorIsLoading: state => state.isLoading,
    selectVendorError: state => state.error,
  },
});

export const {
  setVendors,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  resetVendorList,
  fetchVendors,
  createVendor,
  editVendor,
  removeVendor,
  toggleVendorActive,
} = vendorListSlice.actions;

export const {
  selectVendors,
  selectVendorSearchQuery,
  selectVendorStatusFilter,
  selectVendorSortField,
  selectVendorIsLoading,
  selectVendorError,
} = vendorListSlice.selectors;
