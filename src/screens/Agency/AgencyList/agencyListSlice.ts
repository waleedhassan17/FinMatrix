// ═══════════════════════════════════════════════════════
// FinMatrix — Agency List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with AgencyListScreen.tsx
// Owns all agency data + CRUD thunks + list UI state.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { WarehouseAgency } from '../../../dummy-data/warehouseAgencies';
import {
  getAgenciesAPI,
  createAgencyAPI,
  updateAgencyAPI,
  deleteAgencyAPI,
} from '../../../network/agencyNetwork';

export interface AgencyListSliceState {
  agencies: WarehouseAgency[];
  searchQuery: string;
  typeFilter: string;
  isLoading: boolean;
  error: string;
}

const initialState: AgencyListSliceState = {
  agencies: [],
  searchQuery: '',
  typeFilter: 'all',
  isLoading: false,
  error: '',
};

export const agencyListSlice = createAppSlice({
  name: 'agencyList',
  initialState,
  reducers: create => ({
    setAgencies: create.reducer((state, action: PayloadAction<WarehouseAgency[]>) => {
      state.agencies = action.payload;
    }),
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setTypeFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.typeFilter = action.payload;
    }),
    resetAgencyList: create.reducer(state => {
      state.searchQuery = '';
      state.typeFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchAgencies: create.asyncThunk(
      async () => getAgenciesAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.agencies = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch agencies';
        },
      },
    ),
    createAgency: create.asyncThunk(
      async (data: Omit<WarehouseAgency, 'id' | 'productCount'>) => createAgencyAPI(data),
      {
        fulfilled: (state, action) => {
          state.agencies.push(action.payload);
        },
      },
    ),
    editAgency: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<WarehouseAgency> }) =>
        updateAgencyAPI(id, data),
      {
        fulfilled: (state, action) => {
          const idx = state.agencies.findIndex(a => a.id === action.payload.id);
          if (idx !== -1) state.agencies[idx] = action.payload;
        },
      },
    ),
    removeAgency: create.asyncThunk(
      async (id: string) => {
        await deleteAgencyAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.agencies = state.agencies.filter(a => a.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectAgencies: state => state.agencies,
    selectAgencySearchQuery: state => state.searchQuery,
    selectAgencyTypeFilter: state => state.typeFilter,
    selectAgencyIsLoading: state => state.isLoading,
    selectAgencyError: state => state.error,
  },
});

export const {
  setAgencies,
  setSearchQuery,
  setTypeFilter,
  resetAgencyList,
  fetchAgencies,
  createAgency,
  editAgency,
  removeAgency,
} = agencyListSlice.actions;

export const {
  selectAgencies,
  selectAgencySearchQuery,
  selectAgencyTypeFilter,
  selectAgencyIsLoading,
  selectAgencyError,
} = agencyListSlice.selectors;
