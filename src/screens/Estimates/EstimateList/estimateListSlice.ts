// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Estimate, EstimateStatus } from '../../../types';
import { getEstimatesAPI, deleteEstimateAPI } from '../../../network/estimateNetwork';

export type EstimateStatusFilter = 'all' | EstimateStatus;

export interface EstimateListSliceState {
  estimates: Estimate[];
  searchQuery: string;
  statusFilter: EstimateStatusFilter;
  isLoading: boolean;
  error: string;
}

const initialState: EstimateListSliceState = {
  estimates: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
};

export const estimateListSlice = createAppSlice({
  name: 'estimateList',
  initialState,
  reducers: create => ({
    setEstimates: create.reducer((state, action: PayloadAction<Estimate[]>) => {
      state.estimates = action.payload;
    }),
    setEstimateSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setEstimateStatusFilter: create.reducer((state, action: PayloadAction<EstimateStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    resetEstimateList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    fetchEstimates: create.asyncThunk(
      async () => getEstimatesAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.estimates = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch estimates';
        },
      },
    ),
    removeEstimate: create.asyncThunk(
      async (id: string) => {
        await deleteEstimateAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.estimates = state.estimates.filter(e => e.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectEstimates: state => state.estimates,
    selectEstimateSearchQuery: state => state.searchQuery,
    selectEstimateStatusFilter: state => state.statusFilter,
    selectEstimateIsLoading: state => state.isLoading,
    selectEstimateError: state => state.error,
  },
});

export const {
  setEstimates,
  setEstimateSearchQuery,
  setEstimateStatusFilter,
  resetEstimateList,
  fetchEstimates,
  removeEstimate,
} = estimateListSlice.actions;

export const {
  selectEstimates,
  selectEstimateSearchQuery,
  selectEstimateStatusFilter,
  selectEstimateIsLoading,
  selectEstimateError,
} = estimateListSlice.selectors;
