// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Form Slice (createAppSlice pattern)
// Manages form state, line items, and auto-calculations.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { DiscountType, InvoiceStatus } from '../../../types';
import { getInvoiceByIdAPI } from '../../../networks/sales/invoiceNetwork';
import { invoiceSingleSerializer } from '../../../serializers/invoiceSerializer';

// ── Line item (form representation — string values for inputs) ──
export interface FormLineItem {
  id: string;
  // Optional inventory item link. When set, the backend posts COGS/Inventory
  // and reduces stock on issue (FinMatrixGuide §3.1).
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export interface InvoiceFormSliceState {
  // Header
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;

  // Lines
  lines: FormLineItem[];

  // Discount
  discountType: DiscountType;
  discountValue: string;

  // Computed (derived by calculateTotals reducer)
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;

  // Meta
  errors: Record<string, string>;
  isSaving: boolean;
}

let nextLineId = 1;
const freshLine = (): FormLineItem => ({
  id: `line_${nextLineId++}_${Date.now()}`,
  itemId: '',
  description: '',
  quantity: '',
  unitPrice: '',
  taxRate: '0',
});

const initialState: InvoiceFormSliceState = {
  invoiceNumber: '',
  customerId: '',
  customerName: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
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

// ── Helper: recalculate totals from current state ───
function recalc(state: InvoiceFormSliceState) {
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
  const discAmt = state.discountType === 'percent'
    ? sub * discVal / 100
    : state.discountType === 'amount' ? discVal : 0;

  state.subtotal = Math.round(sub * 100) / 100;
  state.taxAmount = Math.round(tax * 100) / 100;
  state.discountAmount = Math.round(discAmt * 100) / 100;
  state.total = Math.round((sub + tax - discAmt) * 100) / 100;
}

export const invoiceFormSlice = createAppSlice({
  name: 'invoiceForm',
  initialState,
  reducers: create => ({
    // ── Header fields ─────────────────────────────
    setField: create.reducer(
      (state, action: PayloadAction<{ key: keyof InvoiceFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),
    setCustomer: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.customerId = action.payload.id;
        state.customerName = action.payload.name;
        if (state.errors.customerId) {
          const { customerId: _, ...rest } = state.errors;
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

    // ── Line item mutations ───────────────────────
    addLine: create.reducer(state => {
      state.lines.push(freshLine());
    }),
    removeLine: create.reducer((state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(l => l.id !== action.payload);
      recalc(state);
    }),
    updateLine: create.reducer(
      (state, action: PayloadAction<{ id: string; field: keyof FormLineItem; value: string }>) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          (line as any)[action.payload.field] = action.payload.value;
          recalc(state);
        }
      },
    ),
    // Link a line to an inventory item: stamps itemId and auto-fills the
    // description + unit price from the item (both still editable after).
    setLineItem: create.reducer(
      (
        state,
        action: PayloadAction<{
          id: string;
          itemId: string;
          description?: string;
          unitPrice?: string;
        }>,
      ) => {
        const line = state.lines.find(l => l.id === action.payload.id);
        if (line) {
          line.itemId = action.payload.itemId;
          if (action.payload.description) line.description = action.payload.description;
          if (action.payload.unitPrice !== undefined) line.unitPrice = action.payload.unitPrice;
          recalc(state);
        }
      },
    ),

    // ── Totals ────────────────────────────────────
    calculateTotals: create.reducer(state => {
      recalc(state);
    }),

    /**
     * Load an invoice for editing from the API, by id.
     *
     * The screen used to hydrate by finding the invoice in the LIST slice.
     * List rows come through `invoiceListSerializer`, which maps lines as
     * `Array.isArray(raw.lines) ? … : []` — so when the list endpoint returns
     * summary rows, every row carries `lines: []`. The header fields exist on
     * a list row and filled in correctly, the lines did not and came through
     * empty, and saving from that form would have written the invoice back
     * with no items at all.
     *
     * It also meant editing was only possible after the list had loaded, which
     * is not true of every route that reaches this screen.
     *
     * Same shape as `fetchBillForEdit` and `fetchPOForEdit`; this form was the
     * only one of the three still reading from a list.
     */
    fetchInvoiceForEdit: create.asyncThunk(
      async (id: string) => getInvoiceByIdAPI(id),
      {
        fulfilled: (state, action: PayloadAction<unknown>) => {
          const inv = invoiceSingleSerializer(action.payload);
          if (!inv) return;
          state.invoiceNumber = inv.invoiceNumber;
          state.customerId = inv.customerId;
          state.customerName = inv.customerName;
          state.issueDate = inv.issueDate.slice(0, 10);
          state.dueDate = inv.dueDate.slice(0, 10);
          state.status = inv.status;
          state.notes = inv.notes;
          state.lines = inv.lines.map(l => ({
            id: l.id,
            itemId: l.itemId ?? '',
            description: l.description,
            quantity: String(l.quantity),
            unitPrice: String(l.unitPrice),
            taxRate: String(l.taxRate),
          }));
          state.discountType = inv.discountType;
          state.discountValue = String(inv.discountValue);
          state.errors = {};
          state.isSaving = false;
          recalc(state);
        },
      },
    ),

    resetInvoiceForm: create.reducer(state => {
      Object.assign(state, { ...initialState, lines: [freshLine()] });
    }),
  }),

  selectors: {
    selectInvoiceFormState: state => state,
    selectInvoiceFormLines: state => state.lines,
    selectInvoiceFormErrors: state => state.errors,
    selectInvoiceFormIsSaving: state => state.isSaving,
  },
});

export const {
  setField,
  setCustomer,
  setErrors,
  setIsSaving,
  addLine,
  removeLine,
  updateLine,
  setLineItem,
  calculateTotals,
  fetchInvoiceForEdit,
  resetInvoiceForm,
} = invoiceFormSlice.actions;

export const {
  selectInvoiceFormState,
  selectInvoiceFormLines,
  selectInvoiceFormErrors,
  selectInvoiceFormIsSaving,
} = invoiceFormSlice.selectors;
