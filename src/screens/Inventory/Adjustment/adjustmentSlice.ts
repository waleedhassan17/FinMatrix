// ═══════════════════════════════════════════════════════
// FinMatrix — Adjustment Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with AdjustmentScreen.tsx
// Manages adjustment form UI state.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export interface AdjustmentSliceState {
  selectedItemId: string;
  newQty: string;
  reason: string;
  reference: string;
  notes: string;
  isSaving: boolean;
  error: string;
}

const initialState: AdjustmentSliceState = {
  selectedItemId: '',
  newQty: '',
  reason: '',
  reference: '',
  notes: '',
  isSaving: false,
  error: '',
};

export const adjustmentSlice = createAppSlice({
  name: 'adjustment',
  initialState,
  reducers: create => ({
    setSelectedItemId: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedItemId = action.payload;
      state.newQty = '';
    }),
    setNewQty: create.reducer((state, action: PayloadAction<string>) => {
      state.newQty = action.payload;
    }),
    setReason: create.reducer((state, action: PayloadAction<string>) => {
      state.reason = action.payload;
    }),
    setReference: create.reducer((state, action: PayloadAction<string>) => {
      state.reference = action.payload;
    }),
    setNotes: create.reducer((state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    }),
    setIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }),
    resetAdjustment: create.reducer(state => {
      state.selectedItemId = '';
      state.newQty = '';
      state.reason = '';
      state.reference = '';
      state.notes = '';
      state.isSaving = false;
      state.error = '';
    }),
  }),

  selectors: {
    selectAdjustmentItemId: state => state.selectedItemId,
    selectAdjustmentNewQty: state => state.newQty,
    selectAdjustmentReason: state => state.reason,
    selectAdjustmentReference: state => state.reference,
    selectAdjustmentNotes: state => state.notes,
    selectAdjustmentIsSaving: state => state.isSaving,
    selectAdjustmentError: state => state.error,
  },
});

export const {
  setSelectedItemId,
  setNewQty,
  setReason,
  setReference,
  setNotes,
  setIsSaving,
  setError,
  resetAdjustment,
} = adjustmentSlice.actions;

export const {
  selectAdjustmentItemId,
  selectAdjustmentNewQty,
  selectAdjustmentReason,
  selectAdjustmentReference,
  selectAdjustmentNotes,
  selectAdjustmentIsSaving,
  selectAdjustmentError,
} = adjustmentSlice.selectors;
