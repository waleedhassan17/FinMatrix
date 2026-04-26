// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with VendorListScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors `glSlice.ts`.

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
import { vendorListSerializer, vendorSingleSerializer } from '../../../serializers/vendorSerializer';

export type VendorStatusFilter = 'all' | 'active' | 'inactive';
export type VendorSortField = 'name' | 'balance' | 'recent';

export interface VendorListSliceState {
  vendors: Vendor[];
  searchQuery: string;
  statusFilter: VendorStatusFilter;
  sortField: VendorSortField;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalVendors: number;
  activeCount: number;
  inactiveCount: number;
  totalBalance: number;
}

const initialState: VendorListSliceState = {
  vendors: [],
  searchQuery: '',
  statusFilter: 'all',
  sortField: 'name',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalVendors: 0,
  activeCount: 0,
  inactiveCount: 0,
  totalBalance: 0,
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
    /** Upsert a single vendor — used after create/edit/toggle without
     *  refetching the whole list. */
    upsertVendor: create.reducer((state, action: PayloadAction<Vendor>) => {
      const idx = state.vendors.findIndex(v => v.id === action.payload.id);
      if (idx === -1) state.vendors.push(action.payload);
      else state.vendors[idx] = action.payload;
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
      async (_arg, thunkAPI) => {
        const root = thunkAPI.getState() as { vendorList: VendorListSliceState };
        const { searchQuery, statusFilter, sortField } = root.vendorList;
        return getVendorsAPI({
          ...(searchQuery ? { search: searchQuery } : {}),
          status: statusFilter,
          sort: sortField,
        });
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = vendorListSerializer(action.payload);
          state.vendors = data.vendors;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalVendors = data.totalVendors;
          state.activeCount = data.activeCount;
          state.inactiveCount = data.inactiveCount;
          state.totalBalance = data.totalBalance;
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
        fulfilled: (state, action: PayloadAction<any>) => {
          const v = vendorSingleSerializer(action.payload);
          if (v) state.vendors.push(v);
        },
      },
    ),
    editVendor: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<Vendor> }) =>
        updateVendorAPI(id, data),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const v = vendorSingleSerializer(action.payload);
          if (!v) return;
          const idx = state.vendors.findIndex(x => x.id === v.id);
          if (idx !== -1) state.vendors[idx] = v;
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
        fulfilled: (state, action: PayloadAction<any>) => {
          const v = vendorSingleSerializer(action.payload);
          if (!v) return;
          const idx = state.vendors.findIndex(x => x.id === v.id);
          if (idx !== -1) state.vendors[idx] = v;
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
    selectVendorTotals: state => ({
      totalVendors: state.totalVendors,
      activeCount: state.activeCount,
      inactiveCount: state.inactiveCount,
      totalBalance: state.totalBalance,
    }),
  },
});

export const {
  setVendors,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  upsertVendor,
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
  selectVendorTotals,
} = vendorListSlice.selectors;
