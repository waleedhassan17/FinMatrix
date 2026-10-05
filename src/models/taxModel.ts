// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Model
// ═══════════════════════════════════════════════════════
// API contract + UI form contract for the Tax feature.
// Mirrors the GL / Banking / Employees / Payroll pattern.
// Backed by:
//   - Tax Settings:  manage tax rates (CRUD)
//   - Tax Liability: collected vs paid summary report
//   - Tax Payment:   record a payment against a tax rate

import type {
  TaxLiabilityReport,
  TaxLiabilityRow,
  TaxPaymentRecord,
  TaxRate,
  TaxType,
} from '../types';

// ─── Re-export entity types so screens import from the model ─
export type { TaxRate, TaxPaymentRecord, TaxLiabilityRow, TaxLiabilityReport, TaxType };

// ─── API entity aliases ──────────────────────────────
export type TaxRateApi = TaxRate;
export type TaxPaymentApi = TaxPaymentRecord;
export type TaxLiabilityApi = TaxLiabilityReport;

// ─── Envelope responses ──────────────────────────────
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface TaxRateListResponse {
  rates: TaxRateApi[];
}
export interface TaxRateSingleResponse {
  rate: TaxRateApi;
}
export interface TaxRateDeleteResponse {
  id: string;
}
export interface TaxPaymentListResponse {
  payments: TaxPaymentApi[];
}
export interface TaxPaymentSingleResponse {
  payment: TaxPaymentApi;
}
export interface TaxLiabilityResponse {
  report: TaxLiabilityApi;
}

// ─── Payload types ───────────────────────────────────
export type CreateTaxRatePayload = Omit<
  TaxRate,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
>;
export type UpdateTaxRatePayload = Partial<
  Omit<TaxRate, 'id' | 'companyId' | 'createdAt'>
>;
export type CreateTaxPaymentPayload = Omit<
  TaxPaymentRecord,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
>;

// ─── Form helpers / options ──────────────────────────
export const TAX_TYPE_OPTIONS: { label: string; value: TaxType }[] = [
  { label: 'GST', value: 'GST' },
  { label: 'WHT', value: 'WHT' },
  { label: 'Income Tax', value: 'Income Tax' },
  { label: 'Sales Tax', value: 'Sales Tax' },
  { label: 'Custom', value: 'Custom' },
];

export interface ValidationErrors {
  [key: string]: string;
}

export const validateTaxRate = (data: {
  name: string;
  rate: string;
}): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.name.trim()) errors.name = 'Tax name is required';
  const rateNum = parseFloat(data.rate);
  if (!(rateNum >= 0)) errors.rate = 'Rate must be a non-negative number';
  return errors;
};

/** "2026-Q3" — the quarter a date falls in, the period a payment usually settles. */
export const quarterLabel = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!m) return '';
  return `${m[1]}-Q${Math.floor((Number(m[2]) - 1) / 3) + 1}`;
};

export interface TaxPaymentFormValues {
  taxRateId: string;
  amount: string;
  date: string;
  period: string;
  reference: string;
  /** The cash or bank account it is paid from. Empty: the server uses 1000 Cash. */
  bankAccountId: string;
}

export const validateTaxPayment = (data: TaxPaymentFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.taxRateId) errors.taxRateId = 'Select a tax rate';
  const amt = parseFloat(data.amount);
  if (!(amt > 0)) errors.amount = 'Amount must be greater than 0';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.date = 'Date must be in YYYY-MM-DD format';
  const period = data.period.trim();
  if (!period) errors.period = 'Say which period this settles, e.g. 2026-Q3';
  else if (period.length > 32) errors.period = 'Keep the period to 32 characters';
  if (data.reference.trim().length > 64) errors.reference = 'Keep the reference to 64 characters';
  return errors;
};

/**
 * Form → POST /taxes/payments with exactly the DTO's fields. It used to send
 * `date`, `notes`, `taxRateName` and a numeric amount, and to leave out the
 * required `period` and `paymentDate`, so the server refused every payment.
 */
export const taxPaymentPayload = (form: TaxPaymentFormValues): Record<string, string> => {
  const payload: Record<string, string> = {
    taxRateId: form.taxRateId,
    period: form.period.trim(),
    amount: (parseFloat(form.amount.replace(/,/g, '')) || 0).toFixed(2),
    paymentDate: form.date,
  };
  const reference = form.reference.trim();
  if (reference) payload.reference = reference;
  if (form.bankAccountId) payload.bankAccountId = form.bankAccountId;
  return payload;
};
