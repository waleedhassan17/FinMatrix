// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Model & Validation
// ═══════════════════════════════════════════════════════

import type { BillStatus } from '../types';

export interface ValidationErrors {
  [key: string]: string;
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export const BILL_STATUS_COLORS: Record<BillStatus, string> = {
  draft: '#94A3B8',
  open: '#2E75B6',
  partially_paid: '#F39C12',
  paid: '#27AE60',
  overdue: '#E74C3C',
};

export interface BillFormLineData {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  amount: string;
  taxRate: string;
}

export interface BillFormData {
  billNumber: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: BillFormLineData[];
}

export const validateBill = (data: BillFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.vendorId) errors.vendorId = 'Select a vendor';
  if (!data.billNumber.trim()) errors.billNumber = 'Bill number is required';
  if (!data.issueDate) errors.issueDate = 'Issue date is required';
  if (!data.dueDate) errors.dueDate = 'Due date is required';

  if (data.lines.length === 0) {
    errors.lines = 'At least one line item is required';
  }

  const hasEmptyLine = data.lines.some(
    l => !l.accountId || !(parseFloat(l.amount) > 0),
  );
  if (hasEmptyLine) errors.lines = 'All line items must have an account and amount';

  return errors;
};
