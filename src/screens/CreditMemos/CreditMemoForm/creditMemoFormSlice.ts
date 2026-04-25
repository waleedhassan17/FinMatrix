// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Form Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Owns the form state for create/edit AND the post-save
// workflow actions that the activity diagram requires:
//   • Save           — JE: DR Revenue, CR AR
//   • Apply credit   — Apply to other outstanding invoices
//   • Refund         — Refund to customer
//   • Void           — invalidate the memo
// All network calls are routed through serializer + thunks.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { CreditMemo, CreditMemoStatus, PaymentMethod } from '../../../types';
import {
  createCreditMemoAPI,
  updateCreditMemoAPI,
  getCreditMemoByIdAPI,
  applyCreditMemoAPI,
  refundCreditMemoAPI,
  voidCreditMemoAPI,
} from '../../../network/creditMemoNetwork';
import { creditMemoSingleSerializer } from '../../../serializers/creditMemoSerializer';

// ── Form line item (string-typed for unrestricted user input) ──
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
  status: CreditMemoStatus;
  /** Reason for issuing the credit (activity diagram step 6). */
  reason: string;
  lines: CMFormLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  isApplying: boolean;
  isRefunding: boolean;
  isEditMode: boolean;
  editId: string;
}

// ─── Helpers ─────────────────────────────────────────
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
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
};

const initialState: CreditMemoFormState = {
  creditMemoNumber: '',
  customerId: '',
  customerName: '',
  issueDate: new Date().toISOString(),
  invoiceId: '',
  invoiceNumber: '',
  status: 'draft',
  reason: '',
  lines: [emptyLine()],
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  errors: {},
  isSaving: false,
  isApplying: false,
  isRefunding: false,
  isEditMode: false,
  editId: '',
};

// ─── Save payload builder (used by save thunk) ───────
const buildSavePayload = (
  state: CreditMemoFormState,
  saveStatus: CreditMemoStatus,
): Omit<CreditMemo, 'id' | 'createdAt' | 'updatedAt'> => ({
  companyId: 'comp_001',
  creditMemoNumber: state.creditMemoNumber,
  customerId: state.customerId,
  customerName: state.customerName,
  issueDate: new Date(state.issueDate).toISOString(),
  status: saveStatus,
  invoiceId: state.invoiceId || null,
  invoiceNumber: state.invoiceNumber || null,
  lines: state.lines.map(l => ({
    id: l.id,
    itemId: '',
    itemName: l.description,
    description: l.description,
    quantity: parseFloat(l.quantity) || 0,
    unitPrice: parseFloat(l.unitPrice) || 0,
    taxRate: parseFloat(l.taxRate) || 0,
    amount:
      Math.round(
        ((parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)) * 100,
      ) / 100,
  })),
  subtotal: state.subtotal,
  taxAmount: state.taxAmount,
  total: state.total,
  notes: state.reason,
  createdBy: 'admin_001',
});

// ═══════════════════════════════════════════════════════
export const creditMemoFormSlice = createAppSlice({
  name: 'creditMemoForm',
  initialState,
  reducers: create => ({
    setCMField: create.reducer(
      (state, action: PayloadAction<{ field: keyof CreditMemoFormState; value: any }>) => {
        (state as any)[action.payload.field] = action.payload.value;
        if (state.errors[action.payload.field as string]) {
          const { [action.payload.field as string]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setCMCustomer: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setCMErrors: create.reducer(
      (state, action: PayloadAction<Record<string, string>>) => {
        state.errors = action.payload;
      },
    ),

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
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          const t = recalcCM(state.lines);
          state.subtotal = t.subtotal;
          state.taxAmount = t.taxAmount;
          state.total = t.total;
        }
      },
    ),
    calculateCMTotals: create.reducer(state => {
      const t = recalcCM(state.lines);
      state.subtotal = t.subtotal;
      state.taxAmount = t.taxAmount;
      state.total = t.total;
    }),

    loadCreditMemoForEdit: create.reducer(
      (state, action: PayloadAction<CreditMemo>) => {
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
        state.reason = cm.notes;
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
      },
    ),

    resetCreditMemoForm: create.reducer(() => initialState),

    // ──────────────────────────────────────────────────
    // Async thunks
    // ──────────────────────────────────────────────────

    /** Activity diagram step: "Save — JE: DR Revenue, CR AR" */
    saveCreditMemo: create.asyncThunk(
      async (saveStatus: CreditMemoStatus, thunkAPI) => {
        const root = thunkAPI.getState() as { creditMemoForm: CreditMemoFormState };
        const f = root.creditMemoForm;
        const payload = buildSavePayload(f, saveStatus);
        const envelope = f.isEditMode && f.editId
          ? await updateCreditMemoAPI(f.editId, payload)
          : await createCreditMemoAPI(payload);
        return creditMemoSingleSerializer(envelope);
      },
      {
        pending: state => { state.isSaving = true; state.errors = {}; },
        fulfilled: (state, action: PayloadAction<CreditMemo | null>) => {
          state.isSaving = false;
          if (action.payload) {
            state.editId = action.payload.id;
            state.isEditMode = true;
            state.status = action.payload.status;
          }
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.errors = {
            _root: action.error?.message ?? 'Failed to save credit memo',
          };
        },
      },
    ),

    /** Activity diagram: "Apply to other outstanding invoices". */
    applyCreditMemo: create.asyncThunk(
      async (
        args: { id: string; invoiceId: string; invoiceNumber: string; amount: number },
      ) => {
        const envelope = await applyCreditMemoAPI(args.id, {
          invoiceId: args.invoiceId,
          invoiceNumber: args.invoiceNumber,
          amount: args.amount,
        });
        return creditMemoSingleSerializer(envelope);
      },
      {
        pending: state => { state.isApplying = true; },
        fulfilled: (state, action: PayloadAction<CreditMemo | null>) => {
          state.isApplying = false;
          if (action.payload) {
            state.status = action.payload.status;
            state.invoiceId = action.payload.invoiceId ?? '';
            state.invoiceNumber = action.payload.invoiceNumber ?? '';
          }
        },
        rejected: state => { state.isApplying = false; },
      },
    ),

    /** Activity diagram: "Refund to customer". */
    refundCreditMemo: create.asyncThunk(
      async (
        args: {
          id: string;
          method: PaymentMethod;
          reference: string;
          amount: number;
          date: string;
        },
      ) => {
        const envelope = await refundCreditMemoAPI(args.id, {
          method: args.method,
          reference: args.reference,
          amount: args.amount,
          date: args.date,
        });
        return creditMemoSingleSerializer(envelope);
      },
      {
        pending: state => { state.isRefunding = true; },
        fulfilled: (state, action: PayloadAction<CreditMemo | null>) => {
          state.isRefunding = false;
          if (action.payload) {
            state.status = action.payload.status;
            state.reason = action.payload.notes;
          }
        },
        rejected: state => { state.isRefunding = false; },
      },
    ),

    /** Loads an existing credit memo into the form for editing. */
    fetchCreditMemoForEdit: create.asyncThunk(
      async (id: string) => getCreditMemoByIdAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const cm = creditMemoSingleSerializer(action.payload);
          if (!cm) return;
          state.isEditMode = true;
          state.editId = cm.id;
          state.creditMemoNumber = cm.creditMemoNumber;
          state.customerId = cm.customerId;
          state.customerName = cm.customerName;
          state.issueDate = cm.issueDate;
          state.invoiceId = cm.invoiceId || '';
          state.invoiceNumber = cm.invoiceNumber || '';
          state.status = cm.status;
          state.reason = cm.notes;
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
        },
      },
    ),

    voidCreditMemo: create.asyncThunk(
      async (id: string) => voidCreditMemoAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const cm = creditMemoSingleSerializer(action.payload);
          if (cm) state.status = cm.status;
        },
      },
    ),
  }),

  selectors: {
    selectCMForm: state => state,
    selectCMLines: state => state.lines,
    selectCMErrors: state => state.errors,
    selectCMIsSaving: state => state.isSaving,
    selectCMIsApplying: state => state.isApplying,
    selectCMIsRefunding: state => state.isRefunding,
    selectCMIsEditMode: state => state.isEditMode,
  },
});

export const {
  setCMField,
  setCMCustomer,
  setCMErrors,
  addCMLine,
  removeCMLine,
  updateCMLine,
  calculateCMTotals,
  loadCreditMemoForEdit,
  resetCreditMemoForm,
  saveCreditMemo,
  applyCreditMemo,
  refundCreditMemo,
  fetchCreditMemoForEdit,
  voidCreditMemo,
} = creditMemoFormSlice.actions;

export const {
  selectCMForm,
  selectCMLines,
  selectCMErrors,
  selectCMIsSaving,
  selectCMIsApplying,
  selectCMIsRefunding,
  selectCMIsEditMode,
} = creditMemoFormSlice.selectors;
