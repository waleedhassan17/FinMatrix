// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Model
// ═══════════════════════════════════════════════════════

import type { PurchaseOrderStatus } from '../types';

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
