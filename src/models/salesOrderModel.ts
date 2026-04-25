// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Model
// ═══════════════════════════════════════════════════════
// Raw API entity types for the Sales Order feature.

import type { SalesOrderStatus } from '../types';

// ─── Raw API line item ───────────────────────────────
export interface SalesOrderApiLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  fulfilledQuantity: number;
}

// ─── Raw API sales order entity ──────────────────────
export interface SalesOrderApiEntity {
  id: string;
  companyId: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDate: string;
  status: SalesOrderStatus;
  lines: SalesOrderApiLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Optional delivery metadata tracked when we share the
  // sales order (e.g. via WhatsApp). Backend-agnostic.
  sentAt?: string;
  sentChannel?: 'whatsapp' | 'email' | 'share' | null;
  sentToPhone?: string;
}

// ─── Pagination envelope ─────────────────────────────
export interface SalesOrderApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params ────────────────────────────────────
export interface SalesOrderQueryParams {
  search?: string;
  status?: SalesOrderStatus | 'all';
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
