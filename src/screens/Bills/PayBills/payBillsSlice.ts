// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills Slice (createAppSlice pattern)
// Manages form state: vendor, date, method, bank account,
// the bills to settle, the vendor's credit, and the proof.
// Settles the way the web's Pay Bills does: each ticked
// bill's figure is what it is settled by; vendor credit
// covers the first of it, oldest bill first; cash the rest.
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { toIsoDate } from '../../../models/reportModel';
import { createAppSlice } from '@store/createAppSlice';
import type { Bill, BillPayment, PaymentMethod } from '../../../types';
import {
  getBillsAPI,
  payBillsAPI,
  settleBillsAPI,
  uploadBillPaymentProofAPI,
} from '../../../networks/purchases/billNetwork';
import { billListSerializer } from '../../../serializers/billSerializer';
import { getAPPartySummaryAPI } from '../../../networks/reports/apAgingNetwork';
import { partySummarySerializer } from '../../../serializers/partySummarySerializer';
import {
  creditSourcesFromSummary,
  spreadCredits,
  type CreditSource,
  type CreditSpread,
} from '../../../models/creditSpreadModel';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface OutstandingBillRow {
  billId: string;
  billNumber: string;
  vendorName: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  /** What this bill is settled by — vendor credit and cash together. */
  allocated: number;
  /** Of `allocated`, what vendor credit covers — derived, never typed. Credits
   *  post no journal entry when applied (the credit's own creation already
   *  debited A/P), so this part settles the bill without cash leaving. */
  creditApplied: number;
  checked: boolean;
}

export interface PayBillsSliceState {
  vendorId: string;
  vendorName: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  /** What the ticked bills are settled by in all. Derived from the rows. */
  amount: string;
  bankAccountId: string;
  notes: string;
  outstandingRows: OutstandingBillRow[];
  /** The vendor's credits — open ones and ones already partly used. */
  credits: CreditSource[];
  /** On as soon as the vendor has credit, as on the web: using a supplier's
   *  credit before paying them cash is almost always what is meant. */
  useCredits: boolean;
  errors: Record<string, string>;
  isSaving: boolean;
  isLoadingBills: boolean;
  /** Payment proof. `proofId` is what the API needs; the rest drives the UI. */
  proofId: string;
  proofName: string;
  proofMimeType: string;
  /** Local uri of the picked file, for the thumbnail before/after upload. */
  proofLocalUri: string;
  isUploadingProof: boolean;
  proofError: string;
}

const initialState: PayBillsSliceState = {
  vendorId: '',
  vendorName: '',
  // Fresh at every open, not once at bundle startup.
  //
  // This was seeded in initialState, which is evaluated a single time when the
  // store imports the slice. On an app left running for days the form then
  // opened pre-filled with the launch date and posted it as the ACCOUNTING
  // date — a wrong date written into the books, not merely displayed. Local
  // calendar date too: toISOString() is UTC and reads yesterday in PKT before
  // 05:00.
  paymentDate: toIsoDate(new Date()),
  method: 'bank_transfer',
  reference: '',
  amount: '',
  bankAccountId: '',
  notes: '',
  outstandingRows: [],
  credits: [],
  useCredits: false,
  errors: {},
  isSaving: false,
  isLoadingBills: false,
  proofId: '',
  proofName: '',
  proofMimeType: '',
  proofLocalUri: '',
  isUploadingProof: false,
  proofError: '',
};

/**
 * Where the vendor's credit goes: over the ticked bills in the order they are
 * listed (oldest due first), each taking no more than it is being settled by.
 * The web's Pay Bills spreads it the same way.
 */
export function billCreditSpreadOf(
  state: Pick<PayBillsSliceState, 'outstandingRows' | 'credits' | 'useCredits'>,
): CreditSpread {
  return spreadCredits(
    state.outstandingRows
      .filter(r => r.checked && r.allocated > 0)
      .map(r => ({ documentId: r.billId, cap: r.allocated })),
    state.useCredits ? state.credits : [],
  );
}

/** Of a row, what leaves the bank. */
export const cashOf = (row: OutstandingBillRow): number =>
  row.checked ? Math.max(0, round2(row.allocated - row.creditApplied)) : 0;

/** Put the credit on the rows and the total on the form. Run after any change
 *  to the rows, the credits or the switch. */
function recompute(state: PayBillsSliceState) {
  const spread = billCreditSpreadOf(state);
  state.outstandingRows.forEach(r => {
    r.creditApplied = spread.perDocument[r.billId] ?? 0;
  });
  const total = state.outstandingRows.reduce((sum, r) => sum + (r.checked ? r.allocated : 0), 0);
  state.amount = total > 0 ? String(round2(total)) : '';
}

/** Clamp to the bill's balance — you can never settle a supplier's bill for
 *  more than it owes from this screen. */
function clampToBalance(row: OutstandingBillRow, value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return round2(Math.min(value, row.balance));
}

/**
 * The vendor's unpaid bills, oldest due first.
 *
 * Asked of the server by vendor — the web does the same — rather than filtered
 * out of the company's latest 200 bills, which left a busy company's older
 * bills off the list. Drafts and voids are left out: paying a draft is refused
 * with BILL_NOT_POSTED.
 */
export function buildRows(bills: Bill[], vendorId: string): OutstandingBillRow[] {
  return bills
    .filter(
      b =>
        b.vendorId === vendorId &&
        b.status !== 'draft' &&
        b.status !== 'void' &&
        round2(b.total - b.amountPaid) > 0,
    )
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    .map(b => ({
      billId: b.id,
      billNumber: b.billNumber,
      vendorName: b.vendorName,
      dueDate: b.dueDate,
      total: b.total,
      amountPaid: b.amountPaid,
      balance: round2(b.total - b.amountPaid),
      allocated: 0,
      creditApplied: 0,
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
        const changed = state.vendorId !== action.payload.id;
        state.vendorId = action.payload.id;
        state.vendorName = action.payload.name;
        if (state.errors.vendorId) {
          const { vendorId: _, ...rest } = state.errors;
          state.errors = rest;
        }
        // The screen fetches this vendor's bills and credit next.
        if (changed) {
          state.outstandingRows = [];
          state.credits = [];
          state.useCredits = false;
          state.amount = '';
        }
      },
    ),

    /** Ticking a bill offers to settle it in full; unticking clears it. */
    toggleBillCheck: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.billId === action.payload);
        if (row) {
          row.checked = !row.checked;
          row.allocated = row.checked ? row.balance : 0;
        }
        recompute(state);
      },
    ),

    setUseCredits: create.reducer((state, action: PayloadAction<boolean>) => {
      state.useCredits = action.payload;
      if (state.errors.credits) {
        const { credits: _, ...rest } = state.errors;
        state.errors = rest;
      }
      recompute(state);
    }),

    /** How much of one credit to spend, as typed. */
    setCreditUse: create.reducer(
      (state, action: PayloadAction<{ id: string; value: string }>) => {
        const credit = state.credits.find(c => c.id === action.payload.id);
        if (!credit) return;
        credit.use = action.payload.value.replace(/[^0-9.]/g, '');
        recompute(state);
      },
    ),

    /** The per-bill figure: what this bill is settled by. Editable, so a newer
     *  bill can be settled in full while an older one is paid in part. */
    setBillAllocation: create.reducer(
      (state, action: PayloadAction<{ billId: string; value: string }>) => {
        const row = state.outstandingRows.find(r => r.billId === action.payload.billId);
        if (!row) return;
        row.allocated = clampToBalance(row, parseFloat(action.payload.value));
        row.checked = row.allocated > 0;
        recompute(state);
      },
    ),

    toggleAllBills: create.reducer(state => {
      const allChecked = state.outstandingRows.every(r => r.checked);
      state.outstandingRows.forEach(r => {
        r.checked = !allChecked;
        r.allocated = allChecked ? 0 : r.balance;
      });
      recompute(state);
    }),

    payAllBills: create.reducer(state => {
      state.outstandingRows.forEach(r => {
        r.checked = true;
        r.allocated = r.balance;
      });
      recompute(state);
    }),

    clearPaymentProof: create.reducer(state => {
      state.proofId = '';
      state.proofName = '';
      state.proofMimeType = '';
      state.proofLocalUri = '';
      state.proofError = '';
    }),

    /**
     * Upload the proof and hold its id.
     *
     * Separate from savePayment on purpose: the file has to be durable before
     * any money moves, and the Pay button stays disabled until this resolves —
     * so a payment can never be recorded against an upload that failed.
     */
    uploadPaymentProof: create.asyncThunk(
      async (file: { uri: string; name: string; mimeType: string }) =>
        uploadBillPaymentProofAPI(file),
      {
        pending: (state, action) => {
          state.isUploadingProof = true;
          state.proofError = '';
          state.proofId = '';
          state.proofLocalUri = action.meta.arg.uri;
          state.proofName = action.meta.arg.name;
          state.proofMimeType = action.meta.arg.mimeType;
        },
        fulfilled: (state, action: PayloadAction<any>) => {
          state.isUploadingProof = false;
          state.proofId = action.payload?.id ?? '';
          state.proofMimeType = action.payload?.mimeType ?? state.proofMimeType;
          state.proofName = action.payload?.originalName ?? state.proofName;
        },
        rejected: (state, action) => {
          state.isUploadingProof = false;
          state.proofId = '';
          state.proofError = action.error?.message ?? 'Upload failed. Tap to retry.';
        },
      },
    ),

    preselectBill: create.reducer(
      (state, action: PayloadAction<string>) => {
        const row = state.outstandingRows.find(r => r.billId === action.payload);
        if (row) {
          row.checked = true;
          row.allocated = row.balance;
          recompute(state);
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

    /** The vendor's unpaid bills — see buildRows. */
    fetchBillsForPayment: create.asyncThunk(
      async (vendorId: string) => billListSerializer(await getBillsAPI({ vendorId, limit: 200 })).bills,
      {
        pending: state => { state.isLoadingBills = true; },
        fulfilled: (state, action) => {
          // A late answer for a vendor no longer selected is dropped.
          if (action.meta.arg !== state.vendorId) return;
          state.isLoadingBills = false;
          state.outstandingRows = buildRows(action.payload, action.meta.arg);
          recompute(state);
        },
        rejected: (state, action) => {
          if (action.meta.arg === state.vendorId) state.isLoadingBills = false;
        },
      },
    ),

    /**
     * The vendor's credits — open ones and ones already partly used — from the
     * payables summary, the figures the web's Pay Bills reads. Switched on as
     * soon as there are any. A failed lookup offers none; it never blocks
     * paying.
     */
    fetchVendorCreditsForPayment: create.asyncThunk(
      async (vendorId: string) => {
        const summary = partySummarySerializer(await getAPPartySummaryAPI(vendorId));
        return creditSourcesFromSummary(summary?.credits.items ?? [], 'vendor');
      },
      {
        fulfilled: (state, action) => {
          if (action.meta.arg !== state.vendorId) return;
          state.credits = action.payload;
          state.useCredits = action.payload.length > 0;
          recompute(state);
        },
        rejected: (state, action) => {
          if (action.meta.arg === state.vendorId) state.credits = [];
        },
      },
    ),

    savePayment: create.asyncThunk(
      async (
        args: {
          paymentNumber: string;
          /** Stable across retries of THIS payment — see payBillsAPI. */
          idempotencyKey?: string;
        },
        thunkAPI,
      ): Promise<BillPayment> => {
        const root = thunkAPI.getState() as { payBills: PayBillsSliceState };
        const f = root.payBills;

        // Which credit funds which bill — oldest credit first, over the ticked
        // bills oldest first. Credits are fungible against one vendor, so the
        // pairing has no ledger meaning; it only has to be what the server
        // can apply, and the same as the web would send.
        const credits = billCreditSpreadOf(f)
          .pieces.filter(p => p.amount > 0)
          .map(p => ({ vendorCreditId: p.creditId, billId: p.documentId, amount: p.amount.toFixed(2) }));

        // PayBillsDto: vendorId, paymentDate, paymentMethod, bankAccountId,
        // applications[]. Amounts are @IsNumberString, hence the .toFixed(2).
        // Each bill's cash is what it is settled by, less the credit on it.
        const applications = f.outstandingRows
          .map(r => ({ billId: r.billId, amount: cashOf(r) }))
          .filter(a => a.amount > 0.004)
          .map(a => ({ billId: a.billId, amount: a.amount.toFixed(2) }));
        const cashLeg = {
          paymentMethod: toBackendPaymentMethod(f.method),
          bankAccountId: f.bankAccountId,
          reference: f.reference || undefined,
          proofId: f.proofId,
          applications,
        };

        // No credit in play: the plain payment it has always been.
        if (credits.length === 0) {
          return payBillsAPI(
            { vendorId: f.vendorId, paymentDate: f.paymentDate, ...cashLeg },
            args.idempotencyKey,
          );
        }

        // Credit and cash together go as ONE settlement the server runs in a
        // single transaction, credit first. This used to apply each credit
        // with its own request before posting the cash — so a refused payment
        // (a closed period, a bill paid meanwhile, a dropped connection) left
        // the credits spent, and a retry spent them again. Credit alone leaves
        // the cash leg out, so no proof or account is needed.
        //
        // The bills are NOT patched here: the server writes every balance.
        return settleBillsAPI(
          {
            vendorId: f.vendorId,
            paymentDate: f.paymentDate,
            credits,
            ...(applications.length > 0 ? { cash: cashLeg } : {}),
          },
          args.idempotencyKey,
        );
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
    selectPayBillProof: state => ({
      id: state.proofId,
      name: state.proofName,
      mimeType: state.proofMimeType,
      localUri: state.proofLocalUri,
      isUploading: state.isUploadingProof,
      error: state.proofError,
    }),
  },
});

export const {
  setPayBillField,
  setPayBillVendor,
  toggleBillCheck,
  payAllBills,
  setBillAllocation,
  toggleAllBills,
  setUseCredits,
  setCreditUse,
  fetchVendorCreditsForPayment,
  preselectBill,
  clearPaymentProof,
  uploadPaymentProof,
  setPayBillErrors,
  setPayBillIsSaving,
  resetPayBills,
  fetchBillsForPayment,
  savePayment,
} = payBillsSlice.actions;

export const {
  selectPayBillsState,
  selectOutstandingBillRows,
  selectPayBillErrors,
  selectPayBillIsSaving,
  selectPayBillProof,
} = payBillsSlice.selectors;
