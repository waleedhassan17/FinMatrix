// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Payment Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { TaxRate, TaxType, BankAccount } from '../../../types';
import { getTaxRatesAPI, createTaxPaymentAPI } from '../../../network/taxNetwork';
import { getBankAccountsAPI } from '../../../network/bankingNetwork';

export interface TaxPaymentForm {
  taxRateId: string;
  amount: string;
  date: string;
  bankAccountId: string;
  reference: string;
  notes: string;
}

export interface TaxPaymentState {
  taxRates: TaxRate[];
  bankAccounts: BankAccount[];
  form: TaxPaymentForm;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  saved: boolean;
}

const buildInitialForm = (): TaxPaymentForm => ({
  taxRateId: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  bankAccountId: '',
  reference: '',
  notes: '',
});

const initialState: TaxPaymentState = {
  taxRates: [],
  bankAccounts: [],
  form: buildInitialForm(),
  isLoading: false,
  isSaving: false,
  error: '',
  saved: false,
};

export const taxPaymentSlice = createAppSlice({
  name: 'taxPayment',
  initialState,
  reducers: create => ({
    setFormField: create.reducer((state, action: PayloadAction<Partial<TaxPaymentForm>>) => {
      Object.assign(state.form, action.payload);
    }),

    resetForm: create.reducer(state => {
      state.form = buildInitialForm();
      state.saved = false;
      state.error = '';
    }),

    initForTaxRate: create.reducer((state, action: PayloadAction<string>) => {
      state.form.taxRateId = action.payload;
    }),

    loadTaxPaymentDeps: create.asyncThunk(
      async () => {
        const [rates, accounts] = await Promise.all([
          getTaxRatesAPI(),
          getBankAccountsAPI(),
        ]);
        return { rates, accounts };
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          const { rates, accounts } = action.payload;
          state.taxRates = rates.filter(r => r.isActive);
          state.bankAccounts = accounts;
          if (!state.form.taxRateId && state.taxRates.length > 0) {
            state.form.taxRateId = state.taxRates[0].id;
          }
          if (!state.form.bankAccountId && accounts.length > 0) {
            state.form.bankAccountId = accounts[0].id;
          }
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load options';
        },
      },
    ),

    submitTaxPayment: create.asyncThunk(
      async (_: void, { getState }) => {
        const s = (getState() as { taxPayment: TaxPaymentState }).taxPayment;
        const { form, taxRates, bankAccounts } = s;
        const rate    = taxRates.find(r => r.id === form.taxRateId);
        const account = bankAccounts.find(a => a.id === form.bankAccountId);
        return createTaxPaymentAPI({
          taxRateId:       form.taxRateId,
          taxRateName:     rate?.name ?? '',
          taxType:         (rate?.taxType ?? 'GST') as TaxType,
          amount:          parseFloat(form.amount) || 0,
          date:            form.date + 'T00:00:00Z',
          bankAccountId:   form.bankAccountId,
          bankAccountName: account ? `${account.bankName} (${account.accountNumber})` : '',
          reference:       form.reference.trim(),
          notes:           form.notes.trim(),
        });
      },
      {
        pending:   state => { state.isSaving = true; state.error = ''; },
        fulfilled: state => { state.isSaving = false; state.saved = true; },
        rejected:  (state, action) => {
          state.isSaving = false;
          state.error = action.error?.message ?? 'Payment submission failed';
        },
      },
    ),
  }),

  selectors: {
    selectTaxPaymentForm:     state => state.form,
    selectTaxPaymentRates:    state => state.taxRates,
    selectTaxPaymentAccounts: state => state.bankAccounts,
    selectTaxPaymentLoading:  state => state.isLoading,
    selectTaxPaymentSaving:   state => state.isSaving,
    selectTaxPaymentError:    state => state.error,
    selectTaxPaymentSaved:    state => state.saved,
  },
});

export const {
  setFormField, resetForm, initForTaxRate,
  loadTaxPaymentDeps, submitTaxPayment,
} = taxPaymentSlice.actions;

export const {
  selectTaxPaymentForm, selectTaxPaymentRates, selectTaxPaymentAccounts,
  selectTaxPaymentLoading, selectTaxPaymentSaving,
  selectTaxPaymentError, selectTaxPaymentSaved,
} = taxPaymentSlice.selectors;
