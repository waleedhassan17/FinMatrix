// ═══════════════════════════════════════════════════════
// FinMatrix — Physical Count Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with PhysicalCountScreen.tsx
// Manages physical count wizard UI state.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export type PhysicalCountStep = 1 | 2 | 3;
export type SelectionMode = 'all' | 'category' | 'location';

export interface CountLine {
  itemId: string;
  name: string;
  sku: string;
  systemQty: number;
  countQty: string;
}

export interface PhysicalCountSliceState {
  step: PhysicalCountStep;
  selectionMode: SelectionMode;
  categoryFilter: string;
  locationFilter: string;
  countLines: CountLine[];
  isSaving: boolean;
  error: string;
}

const initialState: PhysicalCountSliceState = {
  step: 1,
  selectionMode: 'all',
  categoryFilter: '',
  locationFilter: '',
  countLines: [],
  isSaving: false,
  error: '',
};

export const physicalCountSlice = createAppSlice({
  name: 'physicalCount',
  initialState,
  reducers: create => ({
    setStep: create.reducer((state, action: PayloadAction<PhysicalCountStep>) => {
      state.step = action.payload;
    }),
    setSelectionMode: create.reducer((state, action: PayloadAction<SelectionMode>) => {
      state.selectionMode = action.payload;
      state.categoryFilter = '';
      state.locationFilter = '';
    }),
    setCategoryFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.categoryFilter = action.payload;
    }),
    setLocationFilter: create.reducer((state, action: PayloadAction<string>) => {
      state.locationFilter = action.payload;
    }),
    setCountLines: create.reducer((state, action: PayloadAction<CountLine[]>) => {
      state.countLines = action.payload;
    }),
    updateCountQty: create.reducer(
      (state, action: PayloadAction<{ itemId: string; countQty: string }>) => {
        const line = state.countLines.find(l => l.itemId === action.payload.itemId);
        if (line) line.countQty = action.payload.countQty;
      },
    ),
    setIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }),
    resetPhysicalCount: create.reducer(state => {
      state.step = 1;
      state.selectionMode = 'all';
      state.categoryFilter = '';
      state.locationFilter = '';
      state.countLines = [];
      state.isSaving = false;
      state.error = '';
    }),
  }),

  selectors: {
    selectPhysicalCountStep: state => state.step,
    selectSelectionMode: state => state.selectionMode,
    selectCategoryFilter: state => state.categoryFilter,
    selectLocationFilter: state => state.locationFilter,
    selectCountLines: state => state.countLines,
    selectIsSaving: state => state.isSaving,
    selectPhysicalCountError: state => state.error,
  },
});

export const {
  setStep,
  setSelectionMode,
  setCategoryFilter,
  setLocationFilter,
  setCountLines,
  updateCountQty,
  setIsSaving,
  setError,
  resetPhysicalCount,
} = physicalCountSlice.actions;

export const {
  selectPhysicalCountStep,
  selectSelectionMode,
  selectCategoryFilter,
  selectLocationFilter,
  selectCountLines,
  selectIsSaving,
  selectPhysicalCountError,
} = physicalCountSlice.selectors;
