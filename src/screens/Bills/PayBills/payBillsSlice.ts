// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills Slice (createAppSlice pattern)
// Manages form state: vendor, date, method, amount,
// bank account, outstanding bill checkboxes, and
// auto-distribute.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Bill, BillPayment, BillStatus, PaymentMethod } from '../../../types';
import {
  getBillsAPI,
  payBillsAPI,
} from '../../../networks/purchases/billNetwork';
import { billListSerializer } from '../../../serializers/billSerializer';

/** The API's enum is cash | check | bank_transfer | credit_card | other, so
 *  the UI's `cheque` / `online` have to be translated (same mapping the
 *  customer-side ReceivePayment uses). */
function toBackendPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'cheque':
      return 'check';
    case 'online':
      return 'other';
    case 'cash':
    case 'bank_transfer':
      return method;
    default:
      return 'other';
  }
}

export interface OutstandingBillRow {
  billId: string;
  billNumber: string;
  vendorName: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  allocated: number;
  checked: boolean;
}

export interface PayBillsSliceState {
  vendorId: string;
  vendorName: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  amount: string;
  bankAccountId: string;
  notes: string;
  outstandingRows: OutstandingBillRow[];
  allBills: Bill[];
  errors: Record<string, string>;
  isSaving: boolean;
  isLoadingBills: boolean;
}

const initialState: PayBillsSliceState = {
  vendorId: '',
  vendorName: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  method: 'bank_transfer',
  reference: '',
  amount: '',
  bankAccountId: '',
  notes: '',
  outstandingRows: [],
  allBills: [],
  errors: {},
  isSaving: false,
  isLoadingBills: false,
};

function autoDistribute(state: PayBillsSliceState) {
  let remaining = parseFloat(state.amount) || 0;
  const checkedIds = new Set(
    state.outstandingRows.filter(r => r.checked).map(r => r.billId),
  );

  state.outstandingRows.forEach(row => {
    if (checkedIds.has(row.billId) && remaining > 0) {
      const alloc = Math.min(row.balance, remaining);
      row.allocated = Math.round(alloc * 100) / 100;
      remaining = Math.round((remaining - alloc) * 100) / 100;
    } else {
      row.allocated = 0;
    }
  });
}

function buildRows(bills: Bill[], vendorId: string): OutstandingBillRow[] {
  return bills
    .filter(
      b =>
        b.vendorId === vendorId &&
        (b.status === 'open' || b.status === 'overdue' || b.status === 'partial') &&
        b.total - b.amountPaid > 0,
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map(b => ({
      billId: b.id,
      billNumber: b.billNumber,
      vendorName: b.vendorName,
      dueDate: b.dueDate,
      total: b.total,
      amountPaid: b.amountPaid,
      balance: Math.round((b.total - b.amountPaid) * 100) / 100,
      allocated: 0,
      checked: false,
    }));
}

export const payBillsSlice = createAppSlice({
  name: 'payBills',
  initialState,
  reducers: create => ({
    setPayBillField: create.reducer(
      (state, action: PayloadAction<{ key: keyof PayBillsSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
          state.errors = rest;
        }
      },
    ),

    setPayBillVendor: create.reducer(
      (state, action: PayloadAction<{ id: string; name: string }>) => {
        state.vendorId = action.payload.id;
        state.vendorName = action.payload.name;
        if (state.errors.vendorId) {
          const { vendorId: _, ...rest } = state.errors;
          state.errors = rest;
        }
        state.outstandingRows = buildRows(state.allBills, action.payload.id);
      },
    ),

    toggleBillCheck: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.billId === action.payload);
        if (row) row.checked = !row.checked;
        autoDistribute(state);
      },
    ),

    payAllBills: create.reducer(state => {
      const totalOutstanding = state.outstandingRows.reduce((s, r) => s + r.balance, 0);
      state.amount = String(Math.round(totalOutstanding * 100) / 100);
      state.outstandingRows.forEach(r => { r.checked = true; });
      autoDistribute(state);
    }),

    distributePayBillAmount: create.reducer(state => {
      autoDistribute(state);
    }),

    preselectBill: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.billId === action.payload);
        if (row) {
          row.checked = true;
          if (!state.amount || parseFloat(state.amount) === 0) {
            state.amount = String(row.balance);
          }
          autoDistribute(state);
        }
      },
    ),

    setPayBillErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setPayBillIsSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),

    resetPayBills: create.reducer(state => {
      Object.assign(state, { ...initialState });
    }),

    fetchAllBillsForPayment: create.asyncThunk(
      async () => getBillsAPI({ limit: 200 }),
      {
        pending: state => { state.isLoadingBills = true; },
        fulfilled: (state, action) => {
          const { bills } = billListSerializer(action.payload);
          state.allBills = bills;
          state.isLoadingBills = false;
          if (state.vendorId) {
            state.outstandingRows = buildRows(bills, state.vendorId);
          }
        },
        rejected: state => { state.isLoadingBills = false; },
      },
    ),

    /** Activity step: "Confirm Payment → JE: DR AP, CR Cash for each
     *  vendor → Bills marked Paid, AP & Cash updated".
     *  Creates the BillPayment then patches every allocated bill's
     *  amountPaid + status. Centralises what used to live in the
     *  screen so PayBillsScreen only has to dispatch one action. */
    savePayment: create.asyncThunk(
      async (
        args: {
          paymentNumber: string;
          allocations: { billId: string; billNumber: string; amount: number }[];
        },
        thunkAPI,
      ): Promise<BillPayment> => {
        const root = thunkAPI.getState() as { payBills: PayBillsSliceState };
        const f = root.payBills;

        // PayBillsDto: vendorId, paymentDate, paymentMethod, bankAccountId,
        // applications[]. The old body sent `date`, `method` and
        // `allocations`, so three REQUIRED fields were simply absent and every
        // payment 400'd. Amounts are @IsNumberString, hence the .toFixed(2).
        const payment = await payBillsAPI({
          vendorId: f.vendorId,
          paymentDate: f.paymentDate,
          paymentMethod: toBackendPaymentMethod(f.method),
          bankAccountId: f.bankAccountId,
          reference: f.reference || undefined,
          applications: args.allocations.map(a => ({
            billId: a.billId,
            amount: (Math.round(a.amount * 100) / 100).toFixed(2),
          })),
        });

        // The bills are NOT patched here. `pay()` is transactional: it locks
        // each bill, writes amountPaid/balance/status, adjusts the vendor
        // balance and posts DR AP / CR Bank. Re-applying the amounts from the
        // client would double-count every payment.

        return payment;
      },
      {
        pending: state => { state.isSaving = true; },
        fulfilled: state => { state.isSaving = false; },
        rejected: state => { state.isSaving = false; },
      },
    ),
  }),

  selectors: {
    selectPayBillsState: state => state,
    selectOutstandingBillRows: state => state.outstandingRows,
    selectPayBillErrors: state => state.errors,
    selectPayBillIsSaving: state => state.isSaving,
  },
});

export const {
  setPayBillField,
  setPayBillVendor,
  toggleBillCheck,
  payAllBills,
  distributePayBillAmount,
  preselectBill,
  setPayBillErrors,
  setPayBillIsSaving,
  resetPayBills,
  fetchAllBillsForPayment,
  savePayment,
} = payBillsSlice.actions;

export const {
  selectPayBillsState,
  selectOutstandingBillRows,
  selectPayBillErrors,
  selectPayBillIsSaving,
} = payBillsSlice.selectors;
