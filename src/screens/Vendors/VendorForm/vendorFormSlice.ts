// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Form Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { PaymentTerms } from '../../../types';

export interface VendorFormSliceState {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  paymentTerms: PaymentTerms | '';
  taxId: string;
  defaultExpenseAccountId: string;
  notes: string;
  errors: Record<string, string>;
  isSaving: boolean;
  saveError: string;
}

const initialState: VendorFormSliceState = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Pakistan',
  paymentTerms: '',
  taxId: '',
  defaultExpenseAccountId: '',
  notes: '',
  errors: {},
  isSaving: false,
  saveError: '',
};

export const vendorFormSlice = createAppSlice({
  name: 'vendorForm',
  initialState,
  reducers: create => ({
    setField: create.reducer(
      (state, action: PayloadAction<{ key: keyof VendorFormSliceState; value: any }>) => {
        (state as any)[action.payload.key] = action.payload.value;
        // Clear field error on change
        if (state.errors[action.payload.key]) {
          const { [action.payload.key]: _, ...rest } = state.errors;
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
    loadVendorForEdit: create.reducer(
      (state, action: PayloadAction<Omit<VendorFormSliceState, 'errors' | 'isSaving' | 'saveError'>>) => {
        const d = action.payload;
        state.name = d.name;
        state.contactPerson = d.contactPerson;
        state.email = d.email;
        state.phone = d.phone;
        state.address = d.address;
        state.city = d.city;
        state.state = d.state;
        state.zipCode = d.zipCode;
        state.country = d.country;
        state.paymentTerms = d.paymentTerms;
        state.taxId = d.taxId;
        state.defaultExpenseAccountId = d.defaultExpenseAccountId;
        state.notes = d.notes;
      },
    ),
    resetVendorForm: create.reducer(state => {
      Object.assign(state, initialState);
    }),
  }),

  selectors: {
    selectVendorFormState: state => state,
    selectVendorFormErrors: state => state.errors,
    selectVendorFormIsSaving: state => state.isSaving,
  },
});

export const {
  setField,
  setErrors,
  setIsSaving,
  loadVendorForEdit,
  resetVendorForm,
} = vendorFormSlice.actions;

export const {
  selectVendorFormState,
  selectVendorFormErrors,
  selectVendorFormIsSaving,
} = vendorFormSlice.selectors;
