// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Model & Validation
// ═══════════════════════════════════════════════════════
// Mirrors `glModel.ts` / `billModel.ts`:
//   • API entity types describing the raw backend shape
//   • Pagination envelope
//   • Query params for the list endpoint
//   • Form-validation helpers used by the form screen.

import type { VendorCredit, VendorCreditLine } from '../types';

export type VendorCreditStatus = VendorCredit['status']; // 'draft' | 'issued' | 'applied' | 'voided'

// ─── Raw API entity (backend shape) ──────────────────
export interface VendorCreditApiLineEntity {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  amount: number;
  taxRate: number;
}

export interface VendorCreditApiEntity {
  id: string;
  companyId: string;
  creditNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  status: VendorCreditStatus;
  lines: VendorCreditApiLineEntity[];
  subtotal: number;
  taxAmount: number;
  total: number;
  appliedAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pagination envelope ─────────────────────────────
export interface VendorCreditApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params for list endpoint ──────────────────
export interface VendorCreditQueryParams {
  search?: string;
  status?: 'all' | VendorCreditStatus;
  vendorId?: string;
  page?: number;
  limit?: number;
}

// ─── Re-export the canonical UI types for convenience ─
export type { VendorCredit, VendorCreditLine };

export interface ValidationErrors {
  [key: string]: string;
}

export const VENDOR_CREDIT_STATUS_LABELS: Record<VendorCreditStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  applied: 'Applied',
  voided: 'Voided',
};

export const VENDOR_CREDIT_STATUS_COLORS: Record<VendorCreditStatus, string> = {
  draft: '#8993A4',
  issued: '#0052CC',
  applied: '#00875A',
  voided: '#DE350B',
};

export interface VendorCreditFormLineData {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  amount: string;
  taxRate: string;
}

export interface VendorCreditFormData {
  creditNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  notes: string;
  lines: VendorCreditFormLineData[];
}

export const validateVendorCredit = (
  data: VendorCreditFormData,
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.vendorId) errors.vendorId = 'Select a vendor';
  if (!data.creditNumber.trim()) errors.creditNumber = 'Credit number is required';
  if (!data.date) errors.date = 'Date is required';

  if (data.lines.length === 0) {
    errors.lines = 'At least one line item is required';
  }

  const hasEmptyLine = data.lines.some(
    l => !l.accountId || !(parseFloat(l.amount) > 0),
  );
  if (hasEmptyLine) errors.lines = 'All lines must have an account and a positive amount';

  return errors;
};
