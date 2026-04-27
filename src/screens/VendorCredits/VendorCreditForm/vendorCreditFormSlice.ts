// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Form Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with VendorCreditFormScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors `billFormSlice.ts` / `glSlice.ts`.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { VendorCredit } from '../../../types';
import type { VendorCreditStatus } from '../../../models/vendorCreditModel';
import {
  createVendorCreditAPI,
  updateVendorCreditAPI,
  getVendorCreditByIdAPI,
} from '../../../network/vendorCreditNetwork';
import { vendorCreditSingleSerializer } from '../../../serializers/vendorCreditSerializer';

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
  status: VendorCreditStatus;
  notes: string;
  lines: VCFormLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  errors: Record<string, string>;
  isSaving: boolean;
  saveError: string;
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
  saveError: '',
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

    resetVendorCreditForm: create.reducer(() => initialState),

    // ── Async thunks ────────────────────────────────

    /** Save (create or update) the vendor credit. Mirrors saveBill /
     *  savePurchaseOrder so the screen only needs to dispatch one
     *  action. Routes through network → serializer pipeline. */
    saveVendorCredit: create.asyncThunk(
      async (
        saveStatus: VendorCreditStatus,
        thunkAPI,
      ): Promise<VendorCredit | null> => {
        const root = thunkAPI.getState() as { vendorCreditForm: VendorCreditFormState };
        const f = root.vendorCreditForm;
        const payload = {
          companyId: 'comp_001',
          creditNumber: f.creditNumber,
          vendorId: f.vendorId,
          vendorName: f.vendorName,
          date: new Date(f.date).toISOString(),
          lines: f.lines.map(l => ({
            id: l.id,
            accountId: l.accountId,
            accountName: l.accountName,
            description: l.description,
            amount: parseFloat(l.amount) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
          })),
          subtotal: f.subtotal,
          taxAmount: f.taxAmount,
          total: f.total,
          appliedAmount: 0,
          notes: f.notes,
          status: saveStatus,
          createdBy: 'admin_001',
        };
        const envelope = f.isEditMode && f.editId
          ? await updateVendorCreditAPI(f.editId, payload)
          : await createVendorCreditAPI(payload);
        return vendorCreditSingleSerializer(envelope);
      },
      {
        pending: state => { state.isSaving = true; state.saveError = ''; },
        fulfilled: (state, action: PayloadAction<VendorCredit | null>) => {
          state.isSaving = false;
          if (action.payload?.id) {
            state.editId = action.payload.id;
            state.isEditMode = true;
            state.status = action.payload.status;
          }
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.saveError = action.error?.message ?? 'Failed to save vendor credit';
        },
      },
    ),

    /** Loads an existing vendor credit into the form for editing. */
    fetchVendorCreditForEdit: create.asyncThunk(
      async (id: string) => getVendorCreditByIdAPI(id),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const vc = vendorCreditSingleSerializer(action.payload);
          if (!vc) return;
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
      },
    ),
  }),

  selectors: {
    selectVCForm: state => state,
    selectVCLines: state => state.lines,
    selectVCErrors: state => state.errors,
    selectVCIsSaving: state => state.isSaving,
    selectVCSaveError: state => state.saveError,
    selectVCIsEditMode: state => state.isEditMode,
  },
});

export const {
  setVCField,
  setVCVendor,
  setVCErrors,
  addVCLine,
  removeVCLine,
  updateVCLine,
  setVCLineAccount,
  calculateVCTotals,
  resetVendorCreditForm,
  saveVendorCredit,
  fetchVendorCreditForEdit,
} = vendorCreditFormSlice.actions;

export const {
  selectVCForm,
  selectVCLines,
  selectVCErrors,
  selectVCIsSaving,
  selectVCSaveError,
  selectVCIsEditMode,
} = vendorCreditFormSlice.selectors;
