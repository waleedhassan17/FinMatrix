// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Model
// ═══════════════════════════════════════════════════════
// Raw API entity types for the Estimate feature.

import type { DiscountType, EstimateStatus } from '../types';

// ─── Raw API line item ───────────────────────────────
export interface EstimateApiLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

// ─── Raw API estimate entity ─────────────────────────
export interface EstimateApiEntity {
  id: string;
  companyId: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  expirationDate: string;
  status: EstimateStatus;
  lines: EstimateApiLine[];
  subtotal: number;
  taxAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentChannel?: 'whatsapp' | 'email' | 'share' | null;
  sentToPhone?: string;
}

// ─── Pagination envelope ─────────────────────────────
export interface EstimateApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params ────────────────────────────────────
export interface EstimateQueryParams {
  search?: string;
  status?: EstimateStatus | 'all';
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
