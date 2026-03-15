// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Form Slice
// Credit from vendor against open bills.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { VendorCredit } from '../../../types';

export interface VCFormLine {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  amount: string;
  taxRate: string;
}

export interface VendorCreditFormState {
  creditNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  status: string;
  notes: string;
  lines: VCFormLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  isEditMode: boolean;
  editId: string;
}

const emptyLine = (): VCFormLine => ({
  id: `vcl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  accountId: '',
  accountName: '',
  description: '',
  amount: '',
  taxRate: '0',
});

const recalcVC = (lines: VCFormLine[]) => {
  let subtotal = 0;
  let taxAmount = 0;
  lines.forEach(l => {
    const amt = parseFloat(l.amount) || 0;
    subtotal += amt;
    const tax = parseFloat(l.taxRate) || 0;
    taxAmount += amt * (tax / 100);
  });
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
};

const initialState: VendorCreditFormState = {
  creditNumber: '',
  vendorId: '',
  vendorName: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  notes: '',
  lines: [emptyLine()],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
  isEditMode: false,
  editId: '',
};

export const vendorCreditFormSlice = createAppSlice({
  name: 'vendorCreditForm',
  initialState,
  reducers: create => ({
    setVCField: create.reducer(
      (state, action: PayloadAction<{ field: keyof VendorCreditFormState; value: any }>) => {
        (state as any)[action.payload.field] = action.payload.value;
        if (state.errors[action.payload.field]) {
          const { [action.payload.field]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),

    setVCVendor: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.vendorId = action.payload.id;
        state.vendorName = action.payload.name;
        if (state.errors.vendorId) {
          const { vendorId: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),

    setVCErrors: create.reducer(
      (state, action: PayloadAction<Record<string, string>>) => {
        state.errors = action.payload;
      },
    ),
    setVCIsSaving: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.isSaving = action.payload;
      },
    ),

    addVCLine: create.reducer(state => {
      state.lines.push(emptyLine());
    }),
    removeVCLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      const t = recalcVC(state.lines);
      Object.assign(state, t);
    }),
    updateVCLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof VCFormLine; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) (line as any)[action.payload.field] = action.payload.value;
      },
    ),
    setVCLineAccount: create.reducer(
      (state, action: PayloadAction<{ lineId: string; accountId: string; accountName: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.lineId);
        if (line) {
          line.accountId = action.payload.accountId;
          line.accountName = action.payload.accountName;
        }
      },
    ),

    calculateVCTotals: create.reducer(state => {
      const t = recalcVC(state.lines);
      Object.assign(state, t);
    }),

    loadVendorCreditForEdit: create.reducer(
      (state, action: PayloadAction<VendorCredit>) => {
        const vc = action.payload;
        state.isEditMode = true;
        state.editId = vc.id;
        state.creditNumber = vc.creditNumber;
        state.vendorId = vc.vendorId;
        state.vendorName = vc.vendorName;
        state.date = vc.date.slice(0, 10);
        state.status = vc.status;
        state.notes = vc.notes;
        state.lines = vc.lines.map(l => ({
          id: l.id,
          accountId: l.accountId,
          accountName: l.accountName,
          description: l.description,
          amount: String(l.amount),
          taxRate: String(l.taxRate),
        }));
        const t = recalcVC(state.lines);
        Object.assign(state, t);
        state.errors = {};
      },
    ),

    resetVendorCreditForm: create.reducer(() => initialState),
  }),

  selectors: {
    selectVCForm: state => state,
    selectVCLines: state => state.lines,
    selectVCErrors: state => state.errors,
    selectVCIsSaving: state => state.isSaving,
    selectVCIsEditMode: state => state.isEditMode,
  },
});

export const {
  setVCField,
  setVCVendor,
  setVCErrors,
  setVCIsSaving,
  addVCLine,
  removeVCLine,
  updateVCLine,
  setVCLineAccount,
  calculateVCTotals,
  loadVendorCreditForEdit,
  resetVendorCreditForm,
} = vendorCreditFormSlice.actions;

export const {
  selectVCForm,
  selectVCLines,
  selectVCErrors,
  selectVCIsSaving,
  selectVCIsEditMode,
} = vendorCreditFormSlice.selectors;
