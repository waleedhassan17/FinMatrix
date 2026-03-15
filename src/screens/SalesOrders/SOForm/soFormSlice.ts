// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Form Slice
// Lines track qty + fulfilledQuantity (default 0 for new).
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrderStatus } from '../../../types';

export interface SOFormLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  fulfilledQuantity: number;
}

export interface SOFormSliceState {
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDate: string;
  status: SalesOrderStatus;
  notes: string;
  lines: SOFormLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
}

let nextLineId = 1;
const freshLine = (): SOFormLineItem => ({
  id: `soline_${nextLineId++}_${Date.now()}`,
  description: '',
  quantity: '',
  unitPrice: '',
  taxRate: '0',
  fulfilledQuantity: 0,
});

const initialState: SOFormSliceState = {
  soNumber: '',
  customerId: '',
  customerName: '',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  status: 'open',
  notes: '',
  lines: [freshLine()],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
};

function recalcSO(state: SOFormSliceState) {
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
  state.subtotal = Math.round(sub * 100) / 100;
  state.taxAmount = Math.round(tax * 100) / 100;
  state.total = Math.round((sub + tax) * 100) / 100;
}

export const soFormSlice = createAppSlice({
  name: 'soForm',
  initialState,
  reducers: create => ({
    setSOField: create.reducer(
      (state, action: PayloadAction<{ key: keyof SOFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setSOCustomer: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setSOErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setSOIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    addSOLine: create.reducer(state => { state.lines.push(freshLine()); }),
    removeSOLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      recalcSO(state);
    }),
    updateSOLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof SOFormLineItem; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          recalcSO(state);
        }
      },
    ),
    calculateSOTotals: create.reducer(state => { recalcSO(state); }),
    loadSOForEdit: create.reducer(
      (state, action: PayloadAction<{
        soNumber: string;
        customerId: string;
        customerName: string;
        orderDate: string;
        expectedDate: string;
        status: SalesOrderStatus;
        notes: string;
        lines: SOFormLineItem[];
      }>) => {
        const d = action.payload;
        state.soNumber = d.soNumber;
        state.customerId = d.customerId;
        state.customerName = d.customerName;
        state.orderDate = d.orderDate;
        state.expectedDate = d.expectedDate;
        state.status = d.status;
        state.notes = d.notes;
        state.lines = d.lines;
        state.errors = {};
        state.isSaving = false;
        recalcSO(state);
      },
    ),
    resetSOForm: create.reducer(state => {
      Object.assign(state, { ...initialState, lines: [freshLine()] });
    }),
  }),

  selectors: {
    selectSOFormState: state => state,
    selectSOFormLines: state => state.lines,
    selectSOFormErrors: state => state.errors,
    selectSOFormIsSaving: state => state.isSaving,
  },
});

export const {
  setSOField,
  setSOCustomer,
  setSOErrors,
  setSOIsSaving,
  addSOLine,
  removeSOLine,
  updateSOLine,
  calculateSOTotals,
  loadSOForEdit,
  resetSOForm,
} = soFormSlice.actions;

export const {
  selectSOFormState,
  selectSOFormLines,
  selectSOFormErrors,
  selectSOFormIsSaving,
} = soFormSlice.selectors;
