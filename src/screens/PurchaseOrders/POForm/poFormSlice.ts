// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Form Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Owns form state, line items, auto-totals, AND the save
// thunk that posts via the network + serializer pipeline.
// Mirrors `billFormSlice.ts`.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types';
import {
  createPurchaseOrderAPI,
  updatePurchaseOrderAPI,
  getPurchaseOrderByIdAPI,
} from '../../../networks/purchases/purchaseOrderNetwork';
import { getStoredCompanyId } from '../../../networks/network/apiHelpers';
import { purchaseOrderSingleSerializer } from '../../../serializers/purchaseOrderSerializer';

// ── Line item (form representation — string values for inputs) ──
export interface POFormLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: number;
}

export interface POFormSliceState {
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  lines: POFormLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  saveError: string;
  isEditMode: boolean;
  editingId: string;
}

let nextLineId = 1;
const freshLine = (): POFormLine => ({
  id: `pofl_${nextLineId++}_${Date.now()}`,
  itemId: '',
  itemName: '',
  description: '',
  quantity: '',
  unitPrice: '',
  amount: 0,
});

const initialState: POFormSliceState = {
  poNumber: '',
  vendorId: '',
  vendorName: '',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  notes: '',
  lines: [freshLine()],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
  saveError: '',
  isEditMode: false,
  editingId: '',
};

function recalc(state: POFormSliceState) {
  let sub = 0;
  state.lines.forEach(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    l.amount = Math.round(qty * price * 100) / 100;
    sub += l.amount;
  });
  state.subtotal = Math.round(sub * 100) / 100;
  state.taxAmount = 0;
  state.total = state.subtotal;
}

// Save payload builder.
const buildSavePayload = (
  state: POFormSliceState,
  saveStatus: PurchaseOrderStatus,
): Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'> => ({
  // Tenant is derived server-side from the auth token / x-company-id header;
  // populated from the stored company id at dispatch time, ignored by the
  // backend if it disagrees.
  companyId: '',
  poNumber: state.poNumber.trim(),
  vendorId: state.vendorId,
  vendorName: state.vendorName,
  orderDate: state.orderDate,
  expectedDate: state.expectedDate,
  status: saveStatus,
  lines: state.lines
    .filter(l => l.itemId && parseFloat(l.quantity) > 0)
    .map(l => ({
      id: l.id,
      itemId: l.itemId,
      itemName: l.itemName,
      description: l.description,
      quantity: parseFloat(l.quantity) || 0,
      unitPrice: parseFloat(l.unitPrice) || 0,
      amount: l.amount,
      receivedQuantity: 0,
    })),
  subtotal: state.subtotal,
  taxAmount: state.taxAmount,
  total: state.total,
  notes: state.notes,
  createdBy: 'user_001',
});

export const poFormSlice = createAppSlice({
  name: 'poForm',
  initialState,
  reducers: create => ({
    setField: create.reducer(
      (state, action: PayloadAction<{ key: keyof POFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _omit, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setVendor: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.vendorId = action.payload.id;
        state.vendorName = action.payload.name;
        if (state.errors.vendorId) {
          const { vendorId: _omit, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),

    addLine: create.reducer(state => {
      state.lines.push(freshLine());
    }),
    removeLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      recalc(state);
    }),
    updateLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof POFormLine; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          recalc(state);
        }
      },
    ),
    setLineItem: create.reducer(
      (state, action: PayloadAction<{
        id: string;
        itemId: string;
        itemName: string;
        description: string;
        unitPrice: string;
      }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          line.itemId = action.payload.itemId;
          line.itemName = action.payload.itemName;
          line.description = action.payload.description;
          line.unitPrice = action.payload.unitPrice;
          recalc(state);
        }
      },
    ),

    /** Pre-populate the form from an existing PO (used by Convert-to-Bill
     *  flow on the Bills side). */
    loadForEdit: create.reducer(
      (state, action: PayloadAction<PurchaseOrder>) => {
        const po = action.payload;
        state.poNumber = po.poNumber;
        state.vendorId = po.vendorId;
        state.vendorName = po.vendorName;
        state.orderDate = po.orderDate.slice(0, 10);
        state.expectedDate = po.expectedDate.slice(0, 10);
        state.notes = po.notes;
        state.lines = po.lines.map(l => ({
          id: l.id,
          itemId: l.itemId,
          itemName: l.itemName,
          description: l.description,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          amount: l.amount,
        }));
        state.editingId = po.id;
        state.isEditMode = true;
        state.errors = {};
        recalc(state);
      },
    ),

    resetForm: create.reducer(state => {
      Object.assign(state, { ...initialState, lines: [freshLine()] });
    }),

    // ── Async thunks ────────────────────────────────

    /** Save (create or update) the purchase order. */
    savePurchaseOrder: create.asyncThunk(
      async (saveStatus: PurchaseOrderStatus, thunkAPI) => {
        const root = thunkAPI.getState() as { poForm: POFormSliceState };
        const f = root.poForm;
        const payload = buildSavePayload(f, saveStatus);
        payload.companyId = (await getStoredCompanyId()) ?? '';
        const envelope = f.isEditMode && f.editingId
          ? await updatePurchaseOrderAPI(f.editingId, payload)
          : await createPurchaseOrderAPI(payload);
        return purchaseOrderSingleSerializer(envelope);
      },
      {
        pending: state => { state.isSaving = true; state.saveError = ''; },
        fulfilled: (state, action: PayloadAction<PurchaseOrder | null>) => {
          state.isSaving = false;
          if (action.payload) {
            state.editingId = action.payload.id;
            state.isEditMode = true;
          }
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.saveError = action.error?.message ?? 'Failed to save purchase order';
        },
      },
    ),

    /** Loads an existing PO into the form for editing — survives deep-links
     *  (no need for the list slice to be hydrated). */
    fetchPOForEdit: create.asyncThunk(
      async (id: string) => getPurchaseOrderByIdAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const po = purchaseOrderSingleSerializer(action.payload);
          if (!po) return;
          state.isEditMode = true;
          state.editingId = po.id;
          state.poNumber = po.poNumber;
          state.vendorId = po.vendorId;
          state.vendorName = po.vendorName;
          state.orderDate = po.orderDate.slice(0, 10);
          state.expectedDate = po.expectedDate.slice(0, 10);
          state.notes = po.notes;
          state.lines = po.lines.map(l => ({
            id: l.id,
            itemId: l.itemId,
            itemName: l.itemName,
            description: l.description,
            quantity: String(l.quantity),
            unitPrice: String(l.unitPrice),
            amount: l.amount,
          }));
          state.errors = {};
          recalc(state);
        },
      },
    ),
  }),

  selectors: {
    selectPOFormState: s => s,
    selectPOFormLines: s => s.lines,
    selectPOFormErrors: s => s.errors,
    selectPOFormIsSaving: s => s.isSaving,
    selectPOFormIsEditMode: s => s.isEditMode,
  },
});

export const {
  setField,
  setVendor,
  setErrors,
  setIsSaving,
  addLine,
  removeLine,
  updateLine,
  setLineItem,
  loadForEdit,
  resetForm,
  savePurchaseOrder,
  fetchPOForEdit,
} = poFormSlice.actions;

export const {
  selectPOFormState,
  selectPOFormLines,
  selectPOFormErrors,
  selectPOFormIsSaving,
  selectPOFormIsEditMode,
} = poFormSlice.selectors;
