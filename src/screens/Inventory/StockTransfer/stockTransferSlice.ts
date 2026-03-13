// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Transfer Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with StockTransferScreen.tsx
// Manages stock transfer form UI state.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export interface TransferLine {
  itemId: string;
  name: string;
  sku: string;
  maxQty: number;
  transferQty: string;
}

export interface StockTransferSliceState {
  fromLocation: string;
  toLocation: string;
  reference: string;
  notes: string;
  selectedIds: string[];
  transferLines: TransferLine[];
  isSaving: boolean;
  error: string;
}

const initialState: StockTransferSliceState = {
  fromLocation: '',
  toLocation: '',
  reference: '',
  notes: '',
  selectedIds: [],
  transferLines: [],
  isSaving: false,
  error: '',
};

export const stockTransferSlice = createAppSlice({
  name: 'stockTransfer',
  initialState,
  reducers: create => ({
    setFromLocation: create.reducer((state, action: PayloadAction<string>) => {
      state.fromLocation = action.payload;
      state.selectedIds = [];
      state.transferLines = [];
      if (action.payload === state.toLocation) state.toLocation = '';
    }),
    setToLocation: create.reducer((state, action: PayloadAction<string>) => {
      state.toLocation = action.payload;
    }),
    setReference: create.reducer((state, action: PayloadAction<string>) => {
      state.reference = action.payload;
    }),
    setNotes: create.reducer((state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    }),
    toggleItemSelection: create.reducer(
      (state, action: PayloadAction<{ itemId: string; name: string; sku: string; maxQty: number }>) => {
        const { itemId, name, sku, maxQty } = action.payload;
        const idx = state.selectedIds.indexOf(itemId);
        if (idx !== -1) {
          state.selectedIds.splice(idx, 1);
          state.transferLines = state.transferLines.filter(l => l.itemId !== itemId);
        } else {
          state.selectedIds.push(itemId);
          state.transferLines.push({ itemId, name, sku, maxQty, transferQty: '' });
        }
      },
    ),
    updateTransferQty: create.reducer(
      (state, action: PayloadAction<{ itemId: string; transferQty: string }>) => {
        const line = state.transferLines.find(l => l.itemId === action.payload.itemId);
        if (line) line.transferQty = action.payload.transferQty;
      },
    ),
    setIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }),
    resetStockTransfer: create.reducer(state => {
      state.fromLocation = '';
      state.toLocation = '';
      state.reference = '';
      state.notes = '';
      state.selectedIds = [];
      state.transferLines = [];
      state.isSaving = false;
      state.error = '';
    }),
  }),

  selectors: {
    selectFromLocation: state => state.fromLocation,
    selectToLocation: state => state.toLocation,
    selectTransferReference: state => state.reference,
    selectTransferNotes: state => state.notes,
    selectSelectedIds: state => state.selectedIds,
    selectTransferLines: state => state.transferLines,
    selectTransferIsSaving: state => state.isSaving,
    selectStockTransferError: state => state.error,
  },
});

export const {
  setFromLocation,
  setToLocation,
  setReference,
  setNotes,
  toggleItemSelection,
  updateTransferQty,
  setIsSaving,
  setError,
  resetStockTransfer,
} = stockTransferSlice.actions;

export const {
  selectFromLocation,
  selectToLocation,
  selectTransferReference,
  selectTransferNotes,
  selectSelectedIds,
  selectTransferLines,
  selectTransferIsSaving,
  selectStockTransferError,
} = stockTransferSlice.selectors;
