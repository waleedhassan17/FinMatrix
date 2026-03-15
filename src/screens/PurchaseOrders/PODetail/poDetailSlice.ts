// ═══════════════════════════════════════════════════════
// FinMatrix — PO Detail Slice
// ═══════════════════════════════════════════════════════

import type { PurchaseOrder } from '../../../types';
import { createAppSlice } from '../../../store/createAppSlice';
import { getPurchaseOrderByIdAPI } from '../../../network/purchaseOrderNetwork';

interface ReceivingLine {
  lineId: string;
  itemName: string;
  ordered: number;
  previouslyReceived: number;
  receivingQty: number;
  remaining: number;
}

interface PODetailState {
  item: PurchaseOrder | null;
  isLoading: boolean;
  error: string | null;
  receivingMode: boolean;
  receivingLines: ReceivingLine[];
  isReceiving: boolean;
}

const initialState: PODetailState = {
  item: null,
  isLoading: false,
  error: null,
  receivingMode: false,
  receivingLines: [],
  isReceiving: false,
};

export const poDetailSlice = createAppSlice({
  name: 'poDetail',
  initialState,
  reducers: create => ({
    fetchPODetail: create.asyncThunk(
      async (id: string) => getPurchaseOrderByIdAPI(id),
      {
        pending: state => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.item = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load PO';
        },
      },
    ),
    enterReceivingMode: create.reducer(state => {
      if (!state.item) return;
      state.receivingMode = true;
      state.receivingLines = state.item.lines.map(l => ({
        lineId: l.id,
        itemName: l.itemName,
        ordered: l.quantity,
        previouslyReceived: l.receivedQuantity,
        receivingQty: 0,
        remaining: l.quantity - l.receivedQuantity,
      }));
    }),
    exitReceivingMode: create.reducer(state => {
      state.receivingMode = false;
      state.receivingLines = [];
    }),
    setReceivingQty: create.reducer<{ lineId: string; qty: number }>((state, action) => {
      const line = state.receivingLines.find(l => l.lineId === action.payload.lineId);
      if (line) {
        line.receivingQty = Math.max(0, Math.min(action.payload.qty, line.remaining));
      }
    }),
    setIsReceiving: create.reducer<boolean>((state, action) => {
      state.isReceiving = action.payload;
    }),
    updatePOAfterReceive: create.reducer<PurchaseOrder>((state, action) => {
      state.item = action.payload;
      state.receivingMode = false;
      state.receivingLines = [];
      state.isReceiving = false;
    }),
    clearDetail: create.reducer(() => initialState),
  }),
  selectors: {
    selectItem: s => s.item,
    selectIsLoading: s => s.isLoading,
    selectError: s => s.error,
    selectReceivingMode: s => s.receivingMode,
    selectReceivingLines: s => s.receivingLines,
    selectIsReceiving: s => s.isReceiving,
  },
});

export const {
  fetchPODetail,
  enterReceivingMode,
  exitReceivingMode,
  setReceivingQty,
  setIsReceiving,
  updatePOAfterReceive,
  clearDetail,
} = poDetailSlice.actions;

export const {
  selectItem,
  selectIsLoading,
  selectError,
  selectReceivingMode,
  selectReceivingLines,
  selectIsReceiving,
} = poDetailSlice.selectors;
