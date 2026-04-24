// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Estimate, EstimateStatus } from '../../../types';
import { getEstimatesAPI, deleteEstimateAPI } from '../../../network/estimateNetwork';
import {
  estimateListSerializer,
  estimateSingleSerializer,
} from '../../../serializers/estimateSerializer';

export type EstimateStatusFilter = 'all' | EstimateStatus;

export interface EstimateListSliceState {
  estimates: Estimate[];
  searchQuery: string;
  statusFilter: EstimateStatusFilter;
  isLoading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalEstimates: number;
}

const initialState: EstimateListSliceState = {
  estimates: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalEstimates: 0,
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
      state.page = 1;
      state.totalPages = 1;
      state.totalEstimates = 0;
    }),
    // Upsert a single estimate — used after an action without refetching the whole list.
    upsertEstimate: create.reducer((state, action: PayloadAction<Estimate>) => {
      const idx = state.estimates.findIndex(e => e.id === action.payload.id);
      if (idx === -1) state.estimates.push(action.payload);
      else state.estimates[idx] = action.payload;
    }),

    fetchEstimates: create.asyncThunk(
      async () => getEstimatesAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<any>) => {
          const data = estimateListSerializer(action.payload);
          state.estimates = data.estimates;
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalEstimates = data.totalEstimates;
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

// Exported for consumers who want to apply the serializer locally
export { estimateSingleSerializer };

export const {
  setEstimates,
  setEstimateSearchQuery,
  setEstimateStatusFilter,
  resetEstimateList,
  upsertEstimate,
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
