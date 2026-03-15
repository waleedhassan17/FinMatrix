// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Form Slice (createAppSlice pattern)
// Manages form state, line items, and auto-calculations.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BillStatus } from '../../../types';

// ── Line item (form representation — string values for inputs) ──
export interface BillFormLine {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  amount: string;
  taxRate: string;
}

export interface BillFormSliceState {
  billNumber: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  status: BillStatus;
  notes: string;
  lines: BillFormLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
}

let nextLineId = 1;
const freshLine = (): BillFormLine => ({
  id: `bfl_${nextLineId++}_${Date.now()}`,
  accountId: '',
  accountName: '',
  description: '',
  amount: '',
  taxRate: '0',
});

const initialState: BillFormSliceState = {
  billNumber: '',
  vendorId: '',
  vendorName: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  status: 'draft',
  notes: '',
  lines: [freshLine()],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
};

function recalc(state: BillFormSliceState) {
  let sub = 0;
  let tax = 0;
  state.lines.forEach(l => {
    const amt = parseFloat(l.amount) || 0;
    const rate = parseFloat(l.taxRate) || 0;
    sub += amt;
    tax += amt * rate / 100;
  });
  state.subtotal = Math.round(sub * 100) / 100;
  state.taxAmount = Math.round(tax * 100) / 100;
  state.total = Math.round((sub + tax) * 100) / 100;
}

export const billFormSlice = createAppSlice({
  name: 'billForm',
  initialState,
  reducers: create => ({
    setBillField: create.reducer(
      (state, action: PayloadAction<{ key: keyof BillFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setBillVendor: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.vendorId = action.payload.id;
        state.vendorName = action.payload.name;
        if (state.errors.vendorId) {
          const { vendorId: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setBillErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setBillIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),

    addBillLine: create.reducer(state => {
      state.lines.push(freshLine());
    }),
    removeBillLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      recalc(state);
    }),
    updateBillLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof BillFormLine; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          recalc(state);
        }
      },
    ),
    setBillLineAccount: create.reducer(
      (state, action: PayloadAction<{ lineId: string; accountId: string; accountName: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.lineId);
        if (line) {
          line.accountId = action.payload.accountId;
          line.accountName = action.payload.accountName;
        }
      },
    ),

    calculateBillTotals: create.reducer(state => {
      recalc(state);
    }),

    loadBillForEdit: create.reducer(
      (state, action: PayloadAction<{
        billNumber: string;
        vendorId: string;
        vendorName: string;
        issueDate: string;
        dueDate: string;
        status: BillStatus;
        notes: string;
        lines: BillFormLine[];
      }>) => {
        const d = action.payload;
        state.billNumber = d.billNumber;
        state.vendorId = d.vendorId;
        state.vendorName = d.vendorName;
        state.issueDate = d.issueDate;
        state.dueDate = d.dueDate;
        state.status = d.status;
        state.notes = d.notes;
        state.lines = d.lines;
        state.errors = {};
        state.isSaving = false;
        recalc(state);
      },
    ),

    resetBillForm: create.reducer(state => {
      Object.assign(state, { ...initialState, lines: [freshLine()] });
    }),
  }),

  selectors: {
    selectBillFormState: state => state,
    selectBillFormLines: state => state.lines,
    selectBillFormErrors: state => state.errors,
    selectBillFormIsSaving: state => state.isSaving,
  },
});

export const {
  setBillField,
  setBillVendor,
  setBillErrors,
  setBillIsSaving,
  addBillLine,
  removeBillLine,
  updateBillLine,
  setBillLineAccount,
  calculateBillTotals,
  loadBillForEdit,
  resetBillForm,
} = billFormSlice.actions;

export const {
  selectBillFormState,
  selectBillFormLines,
  selectBillFormErrors,
  selectBillFormIsSaving,
} = billFormSlice.selectors;
