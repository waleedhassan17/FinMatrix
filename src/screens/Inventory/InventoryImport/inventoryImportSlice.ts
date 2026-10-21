// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Import Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with InventoryImportScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
//
// The file picked is kept here (a URI, not its bytes) because the commit sends
// the SAME file again: the server is stateless between preview and commit.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  commitInventoryImportAPI,
  previewInventoryImportAPI,
  type ImportFileAsset,
} from '../../../networks/inventory/inventoryNetwork';
import { inventoryImportSerializer } from '../../../serializers/inventoryImportSerializer';
import type { ImportResult, ImportTab } from '../../../models/inventoryImportModel';

export interface InventoryImportSliceState {
  file: ImportFileAsset | null;
  preview: ImportResult | null;
  /** The commit's answer; once set, the screen shows the outcome. */
  result: ImportResult | null;
  tab: ImportTab;
  openingStockDate: string;
  isPreviewing: boolean;
  isCommitting: boolean;
  error: string;
}

const initialState: InventoryImportSliceState = {
  file: null,
  preview: null,
  result: null,
  tab: 'all',
  openingStockDate: '',
  isPreviewing: false,
  isCommitting: false,
  error: '',
};

export const inventoryImportSlice = createAppSlice({
  name: 'inventoryImport',
  initialState,
  reducers: create => ({
    setImportTab: create.reducer((state, action: PayloadAction<ImportTab>) => {
      state.tab = action.payload;
    }),
    setOpeningStockDate: create.reducer((state, action: PayloadAction<string>) => {
      state.openingStockDate = action.payload;
    }),
    resetInventoryImport: create.reducer(() => initialState),

    previewInventoryImport: create.asyncThunk(
      async (file: ImportFileAsset) => previewInventoryImportAPI(file),
      {
        pending: (state, action) => {
          state.file = action.meta.arg;
          state.preview = null;
          state.result = null;
          state.tab = 'all';
          state.error = '';
          state.isPreviewing = true;
        },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.preview = inventoryImportSerializer(action.payload);
          state.isPreviewing = false;
        },
        rejected: (state, action) => {
          state.isPreviewing = false;
          state.error = action.error?.message ?? 'The file could not be read.';
        },
      },
    ),

    commitInventoryImport: create.asyncThunk(
      async (arg: {
        file: ImportFileAsset;
        openingStockDate?: string;
        confirmOpeningStockValue?: string;
        idempotencyKey: string;
      }) =>
        commitInventoryImportAPI(
          arg.file,
          {
            openingStockDate: arg.openingStockDate,
            confirmOpeningStockValue: arg.confirmOpeningStockValue,
          },
          arg.idempotencyKey,
        ),
      {
        pending: state => {
          state.isCommitting = true;
          state.error = '';
        },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.result = inventoryImportSerializer(action.payload);
          state.isCommitting = false;
        },
        rejected: state => {
          // The screen reads the message (and code) from .unwrap(), and a
          // stale preview is refreshed rather than shown as a dead end.
          state.isCommitting = false;
        },
      },
    ),
  }),

  selectors: {
    selectImportFile: state => state.file,
    selectImportPreview: state => state.preview,
    selectImportResult: state => state.result,
    selectImportTab: state => state.tab,
    selectOpeningStockDate: state => state.openingStockDate,
    selectImportIsPreviewing: state => state.isPreviewing,
    selectImportIsCommitting: state => state.isCommitting,
    selectImportError: state => state.error,
  },
});

export const {
  setImportTab,
  setOpeningStockDate,
  resetInventoryImport,
  previewInventoryImport,
  commitInventoryImport,
} = inventoryImportSlice.actions;

export const {
  selectImportFile,
  selectImportPreview,
  selectImportResult,
  selectImportTab,
  selectOpeningStockDate,
  selectImportIsPreviewing,
  selectImportIsCommitting,
  selectImportError,
} = inventoryImportSlice.selectors;
