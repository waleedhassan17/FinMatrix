// ═══════════════════════════════════════════════════════
// FinMatrix — PO Form Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import type { PurchaseOrder } from '../../../types';
import { type POFormLineData, freshPOLine } from '../../../models/purchaseOrderModel';

interface POFormState {
  vendorId: string;
  vendorName: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  lines: POFormLineData[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  editingId: string | null;
}

const initialState: POFormState = {
  vendorId: '',
  vendorName: '',
  poNumber: '',
  orderDate: '',
  expectedDate: '',
  notes: '',
  lines: [freshPOLine('line_1')],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
  editingId: null,
};

const recalc = (lines: POFormLineData[]) => {
  let subtotal = 0;
  lines.forEach(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    l.amount = qty * price;
    subtotal += l.amount;
  });
  return { subtotal, taxAmount: 0, total: subtotal };
};

export const poFormSlice = createAppSlice({
  name: 'poForm',
  initialState,
  reducers: create => ({
    setField: create.reducer<{ key: keyof POFormState; value: string }>((state, action) => {
      (state as any)[action.payload.key] = action.payload.value;
    }),
    setVendor: create.reducer<{ id: string; name: string }>((state, action) => {
      state.vendorId = action.payload.id;
      state.vendorName = action.payload.name;
    }),
    setErrors: create.reducer<Record<string, string>>((state, action) => {
      state.errors = action.payload;
    }),
    setIsSaving: create.reducer<boolean>((state, action) => {
      state.isSaving = action.payload;
    }),
    addLine: create.reducer(state => {
      state.lines.push(freshPOLine(`line_${Date.now()}`));
    }),
    removeLine: create.reducer<string>((state, action) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      const t = recalc(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
    }),
    updateLine: create.reducer<{ id: string; field: keyof POFormLineData; value: string }>(
      (state, action) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          const t = recalc(state.lines);
          state.subtotal = t.subtotal;
          state.taxAmount = t.taxAmount;
          state.total = t.total;
        }
      },
    ),
    setLineItem: create.reducer<{
      id: string;
      itemId: string;
      itemName: string;
      description: string;
      unitPrice: string;
    }>((state, action) => {
      const line = state.lines.find(l => l.id === action.payload.id);
      if (line) {
        line.itemId = action.payload.itemId;
        line.itemName = action.payload.itemName;
        line.description = action.payload.description;
        line.unitPrice = action.payload.unitPrice;
        const t = recalc(state.lines);
        state.subtotal = t.subtotal;
        state.taxAmount = t.taxAmount;
        state.total = t.total;
      }
    }),
    calculateTotals: create.reducer(state => {
      const t = recalc(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
    }),
    loadForEdit: create.reducer<PurchaseOrder>((state, action) => {
      const po = action.payload;
      state.editingId = po.id;
      state.vendorId = po.vendorId;
      state.vendorName = po.vendorName;
      state.poNumber = po.poNumber;
      state.orderDate = po.orderDate;
      state.expectedDate = po.expectedDate;
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
      state.subtotal = po.subtotal;
      state.taxAmount = po.taxAmount;
      state.total = po.total;
    }),
    resetForm: create.reducer(() => initialState),
  }),
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
  calculateTotals,
  loadForEdit,
  resetForm,
} = poFormSlice.actions;
