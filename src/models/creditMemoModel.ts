// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Model
// ═══════════════════════════════════════════════════════
// Defines the expected shape of the Credit Memo data
// returned by the backend. Mirrors `glModel.ts` so
// real-API integration only swaps function bodies.

import type { CreditMemoStatus, PaymentMethod } from '../types';

// ─── Raw API line item ───────────────────────────────
export interface CreditMemoLineApiEntity {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

// ─── Raw API credit-memo entity ──────────────────────
export interface CreditMemoApiEntity {
  id: string;
  companyId: string;
  creditMemoNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  status: CreditMemoStatus;
  invoiceId: string | null;
  invoiceNumber: string | null;
  lines: CreditMemoLineApiEntity[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pagination envelope ─────────────────────────────
export interface CreditMemoApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params for list endpoint ──────────────────
export interface CreditMemoQueryParams {
  search?: string;
  status?: CreditMemoStatus | 'all';
  customerId?: string;
  invoiceId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ─── Apply credit (activity diagram step: "Apply to other outstanding invoices") ──
export interface CreditMemoApplyApiData {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

// ─── Refund (activity diagram step: "Refund to customer") ──
export interface CreditMemoRefundApiData {
  method: PaymentMethod;
  reference: string;
  amount: number;
  date: string;
}
