// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Model & Validation
// ═══════════════════════════════════════════════════════

import type { PaymentTerms } from '../types';

export interface ValidationErrors {
  [key: string]: string;
}

export interface VendorFormData {
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
}

export const PAYMENT_TERMS_OPTIONS: { label: string; value: PaymentTerms }[] = [
  { label: 'Due on Receipt', value: 'due_on_receipt' },
  { label: 'Net 15', value: 'net_15' },
  { label: 'Net 30', value: 'net_30' },
  { label: 'Net 45', value: 'net_45' },
  { label: 'Net 60', value: 'net_60' },
  { label: 'Custom', value: 'custom' },
];

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: 'Due on Receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  custom: 'Custom',
};

export const validateVendor = (data: VendorFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Company name is required';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.phone && !/^[+\d\s\-()]+$/.test(data.phone)) {
    errors.phone = 'Invalid phone format';
  }

  if (!data.paymentTerms) {
    errors.paymentTerms = 'Payment terms are required';
  }

  return errors;
};
