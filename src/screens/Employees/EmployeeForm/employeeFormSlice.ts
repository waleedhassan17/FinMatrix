// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Form Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type {
  EmploymentStatus,
  EmploymentType,
  EmployeeDepartment,
  PayFrequency,
  PayType,
  EmployeeRecord,
} from '../../../models/employeeModel';

export interface EmployeeFormState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  department: EmployeeDepartment | '';
  position: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  payType: PayType;
  payFrequency: PayFrequency;
  salaryAmount: string;
  hourlyRate: string;
  hoursPerWeek: string;
  deductionTax: string;
  deductionInsurance: string;
  deductionRetirement: string;
  deductionOther: string;
  bankName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  notes: string;
  errors: Record<string, string>;
  isSaving: boolean;
}

const initialState: EmployeeFormState = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  department: '',
  position: '',
  employmentType: 'full_time',
  status: 'active',
  startDate: new Date().toISOString().slice(0, 10),
  payType: 'salary',
  payFrequency: 'monthly',
  salaryAmount: '',
  hourlyRate: '',
  hoursPerWeek: '40',
  deductionTax: '0',
  deductionInsurance: '0',
  deductionRetirement: '0',
  deductionOther: '0',
  bankName: '',
  bankAccountNumber: '',
  bankRoutingNumber: '',
  notes: '',
  errors: {},
  isSaving: false,
};

export const employeeFormSlice = createAppSlice({
  name: 'employeeForm',
  initialState,
  reducers: create => ({
    setEmployeeField: create.reducer((state, action: PayloadAction<{ key: keyof EmployeeFormState; value: any }>) => {
      (state as any)[action.payload.key] = action.payload.value;
      if (state.errors[action.payload.key]) {
        const { [action.payload.key]: _, ...rest } = state.errors;
        state.errors = rest;
      }
    }),
    setEmployeeFormErrors: create.reducer((state, action: PayloadAction<Record<string, string>>) => {
      state.errors = action.payload;
    }),
    setEmployeeFormSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),
    loadEmployeeForEdit: create.reducer((state, action: PayloadAction<EmployeeRecord>) => {
      const e = action.payload;
      state.fullName = e.fullName;
      state.email = e.email;
      state.phone = e.phone;
      state.address = e.address ?? '';
      state.taxId = e.taxId ?? '';
      state.department = e.department;
      state.position = e.position;
      state.employmentType = e.employmentType;
      state.status = e.status;
      state.startDate = e.startDate;
      state.payType = e.payType;
      state.payFrequency = e.payFrequency ?? 'monthly';
      state.salaryAmount = e.salaryAmount ? String(e.salaryAmount) : '';
      state.hourlyRate = e.hourlyRate ? String(e.hourlyRate) : '';
      state.hoursPerWeek = String(e.hoursPerWeek || 40);
      state.deductionTax = String(e.deductions.tax);
      state.deductionInsurance = String(e.deductions.insurance);
      state.deductionRetirement = String(e.deductions.retirement);
      state.deductionOther = String(e.deductions.other);
      state.bankName = e.banking.bankName;
      state.bankAccountNumber = e.banking.accountNumber;
      state.bankRoutingNumber = e.banking.routingNumber;
      state.notes = e.notes;
      state.errors = {};
    }),
    resetEmployeeForm: create.reducer(() => initialState),
  }),
  selectors: {
    selectEmployeeFormState: state => state,
    selectEmployeeFormErrors: state => state.errors,
    selectEmployeeFormIsSaving: state => state.isSaving,
  },
});

export const {
  setEmployeeField,
  setEmployeeFormErrors,
  setEmployeeFormSaving,
  loadEmployeeForEdit,
  resetEmployeeForm,
} = employeeFormSlice.actions;

export const {
  selectEmployeeFormState,
  selectEmployeeFormErrors,
  selectEmployeeFormIsSaving,
} = employeeFormSlice.selectors;
