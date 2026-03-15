// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Form Slice
// No discount — straight credit lines.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { CreditMemo } from '../../../types';

export interface CMFormLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export interface CreditMemoFormState {
  creditMemoNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  notes: string;
  lines: CMFormLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  isEditMode: boolean;
  editId: string;
}

const emptyLine = (): CMFormLineItem => ({
  id: `cml_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '0',
});

const recalcCM = (lines: CMFormLineItem[]) => {
  let subtotal = 0;
  let taxAmount = 0;
  lines.forEach(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const lineTotal = qty * price;
    subtotal += lineTotal;
    const taxRate = parseFloat(l.taxRate) || 0;
    taxAmount += lineTotal * (taxRate / 100);
  });
  return { subtotal, taxAmount, total: subtotal + taxAmount };
};

const initialState: CreditMemoFormState = {
  creditMemoNumber: '',
  customerId: '',
  customerName: '',
  issueDate: new Date().toISOString(),
  invoiceId: '',
  invoiceNumber: '',
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

export const creditMemoFormSlice = createAppSlice({
  name: 'creditMemoForm',
  initialState,
  reducers: create => ({
    setCMField: create.reducer((state, action: PayloadAction<{ field: keyof CreditMemoFormState; value: any }>) => {
      (state as any)[action.payload.field] = action.payload.value;
    }),
    setCMCustomer: create.reducer((state, action: PayloadAction<{ id: string; name: string }>) => {
      state.customerId = action.payload.id;
      state.customerName = action.payload.name;
    }),
    setCMErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setCMIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),

    addCMLine: create.reducer(state => {
      state.lines.push(emptyLine());
    }),
    removeCMLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      const t = recalcCM(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
    }),
    updateCMLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof CMFormLineItem; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) (line as any)[action.payload.field] = action.payload.value;
      },
    ),
    calculateCMTotals: create.reducer(state => {
      const t = recalcCM(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
    }),

    loadCreditMemoForEdit: create.reducer((state, action: PayloadAction<CreditMemo>) => {
      const cm = action.payload;
      state.isEditMode = true;
      state.editId = cm.id;
      state.creditMemoNumber = cm.creditMemoNumber;
      state.customerId = cm.customerId;
      state.customerName = cm.customerName;
      state.issueDate = cm.issueDate;
      state.invoiceId = cm.invoiceId || '';
      state.invoiceNumber = cm.invoiceNumber || '';
      state.status = cm.status;
      state.notes = cm.notes;
      state.lines = cm.lines.map(l => ({
        id: l.id,
        description: l.description,
        quantity: String(l.quantity),
        unitPrice: String(l.unitPrice),
        taxRate: String(l.taxRate),
      }));
      const t = recalcCM(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
      state.errors = {};
    }),

    resetCreditMemoForm: create.reducer(() => initialState),
  }),

  selectors: {
    selectCMForm: state => state,
    selectCMLines: state => state.lines,
    selectCMErrors: state => state.errors,
    selectCMIsSaving: state => state.isSaving,
    selectCMIsEditMode: state => state.isEditMode,
  },
});

export const {
  setCMField,
  setCMCustomer,
  setCMErrors,
  setCMIsSaving,
  addCMLine,
  removeCMLine,
  updateCMLine,
  calculateCMTotals,
  loadCreditMemoForEdit,
  resetCreditMemoForm,
} = creditMemoFormSlice.actions;

export const {
  selectCMForm,
  selectCMLines,
  selectCMErrors,
  selectCMIsSaving,
  selectCMIsEditMode,
} = creditMemoFormSlice.selectors;
