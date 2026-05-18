// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Form Slice (createAppSlice pattern)
// Like InvoiceForm but with expirationDate instead of dueDate.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { DiscountType, EstimateStatus } from '../../../types';

export interface FormLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export interface EstimateFormSliceState {
  estimateNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  expirationDate: string;
  status: EstimateStatus;
  notes: string;
  lines: FormLineItem[];
  discountType: DiscountType;
  discountValue: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
}

let nextLineId = 1;
const freshLine = (): FormLineItem => ({
  id: `eline_${nextLineId++}_${Date.now()}`,
  description: '',
  quantity: '',
  unitPrice: '',
  taxRate: '0',
});

const initialState: EstimateFormSliceState = {
  estimateNumber: '',
  customerId: '',
  customerName: '',
  issueDate: new Date().toISOString().slice(0, 10),
  expirationDate: '',
  status: 'draft',
  notes: '',
  lines: [freshLine()],
  discountType: 'none',
  discountValue: '0',
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
};

function recalc(state: EstimateFormSliceState) {
  let sub = 0;
  let tax = 0;
  state.lines.forEach(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const rate = parseFloat(l.taxRate) || 0;
    const lineAmt = qty * price;
    sub += lineAmt;
    tax += lineAmt * rate / 100;
  });
  const discVal = parseFloat(state.discountValue) || 0;
  const discAmt = state.discountType === 'percent' ? sub * discVal / 100 : state.discountType === 'amount' ? discVal : 0;
  state.subtotal = Math.round(sub * 100) / 100;
  state.taxAmount = Math.round(tax * 100) / 100;
  state.discountAmount = Math.round(discAmt * 100) / 100;
  state.total = Math.round((sub + tax - discAmt) * 100) / 100;
}

export const estimateFormSlice = createAppSlice({
  name: 'estimateForm',
  initialState,
  reducers: create => ({
    setEstField: create.reducer(
      (state, action: PayloadAction<{ key: keyof EstimateFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setEstCustomer: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setEstErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setEstIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    addEstLine: create.reducer(state => { state.lines.push(freshLine()); }),
    removeEstLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      recalc(state);
    }),
    updateEstLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof FormLineItem; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          recalc(state);
        }
      },
    ),
    calculateEstTotals: create.reducer(state => { recalc(state); }),
    loadEstimateForEdit: create.reducer(
      (state, action: PayloadAction<{
        estimateNumber: string;
        customerId: string;
        customerName: string;
        issueDate: string;
        expirationDate: string;
        status: EstimateStatus;
        notes: string;
        lines: FormLineItem[];
        discountType: DiscountType;
        discountValue: string;
      }>) => {
        const d = action.payload;
        state.estimateNumber = d.estimateNumber;
        state.customerId = d.customerId;
        state.customerName = d.customerName;
        state.issueDate = d.issueDate;
        state.expirationDate = d.expirationDate;
        state.status = d.status;
        state.notes = d.notes;
        state.lines = d.lines;
        state.discountType = d.discountType;
        state.discountValue = d.discountValue;
        state.errors = {};
        state.isSaving = false;
        recalc(state);
      },
    ),
    resetEstimateForm: create.reducer(state => {
      Object.assign(state, { ...initialState, lines: [freshLine()] });
    }),
  }),

  selectors: {
    selectEstimateFormState: state => state,
    selectEstimateFormLines: state => state.lines,
    selectEstimateFormErrors: state => state.errors,
    selectEstimateFormIsSaving: state => state.isSaving,
  },
});

export const {
  setEstField,
  setEstCustomer,
  setEstErrors,
  setEstIsSaving,
  addEstLine,
  removeEstLine,
  updateEstLine,
  calculateEstTotals,
  loadEstimateForEdit,
  resetEstimateForm,
} = estimateFormSlice.actions;

export const {
  selectEstimateFormState,
  selectEstimateFormLines,
  selectEstimateFormErrors,
  selectEstimateFormIsSaving,
} = estimateFormSlice.selectors;
