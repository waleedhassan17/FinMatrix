// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Model & Validation
// ═══════════════════════════════════════════════════════

import type { PaymentTerms } from '../types';

export interface ValidationErrors {
  [key: string]: string;
}

export interface CustomerFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  // Billing Address
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  billingCountry: string;
  // Shipping Address
  sameAsBilling: boolean;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  // Credit & Terms
  creditLimit: string;
  paymentTerms: PaymentTerms | '';
  // Extra
  contactPerson: string;
  taxId: string;
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

export const validateCustomer = (data: CustomerFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Customer name is required';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.phone && !/^[+\d\s\-()]+$/.test(data.phone)) {
    errors.phone = 'Invalid phone format';
  }

  if (!data.billingStreet.trim()) {
    errors.billingStreet = 'Billing street is required';
  }
  if (!data.billingCity.trim()) {
    errors.billingCity = 'Billing city is required';
  }

  if (!data.sameAsBilling) {
    if (!data.shippingStreet.trim()) {
      errors.shippingStreet = 'Shipping street is required';
    }
    if (!data.shippingCity.trim()) {
      errors.shippingCity = 'Shipping city is required';
    }
  }

  if (data.creditLimit) {
    const limit = parseFloat(data.creditLimit);
    if (isNaN(limit) || limit < 0) {
      errors.creditLimit = 'Credit limit must be a positive number';
    }
  }

  if (!data.paymentTerms) {
    errors.paymentTerms = 'Payment terms are required';
  }

  return errors;
};
