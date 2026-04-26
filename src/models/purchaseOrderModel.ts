// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Model & Validation
// ═══════════════════════════════════════════════════════
// Mirrors `billModel.ts` / `glModel.ts`:
//   • API entity types describing the raw backend shape
//   • Pagination envelope
//   • Query params for the list endpoint
// Plus the existing form-validation helpers used by the form screen.

import type { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from '../types';

// ─── Raw API entity (backend shape) ──────────────────
export interface PurchaseOrderApiLineEntity {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  receivedQuantity: number;
}

export interface PurchaseOrderApiEntity {
  id: string;
  companyId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderApiLineEntity[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pagination envelope ─────────────────────────────
export interface PurchaseOrderApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params for list endpoint ──────────────────
export interface PurchaseOrderQueryParams {
  search?: string;
  status?: 'all' | PurchaseOrderStatus;
  vendorId?: string;
  page?: number;
  limit?: number;
}

// ─── Re-export the canonical UI types for convenience ─
export type { PurchaseOrder, PurchaseOrderLine };

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partially Received',
  fully_received: 'Fully Received',
  closed: 'Closed',
};

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: '#94A3B8',
  sent: '#2E75B6',
  partially_received: '#F39C12',
  fully_received: '#27AE60',
  closed: '#6B7280',
};

export interface POFormLineData {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: number;
}

export interface POFormData {
  vendorId: string;
  vendorName: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  lines: POFormLineData[];
}

export const freshPOLine = (id: string): POFormLineData => ({
  id,
  itemId: '',
  itemName: '',
  description: '',
  quantity: '',
  unitPrice: '',
  amount: 0,
});

export const validatePO = (data: POFormData): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!data.vendorId) errors.vendorId = 'Vendor is required';
  if (!data.orderDate) errors.orderDate = 'Order date is required';
  if (!data.expectedDate) errors.expectedDate = 'Expected date is required';
  const validLines = data.lines.filter(
    l => l.itemId && parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) > 0,
  );
  if (validLines.length === 0) errors.lines = 'At least one valid line item is required';
  return errors;
};
