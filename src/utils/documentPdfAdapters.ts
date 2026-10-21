// ═══════════════════════════════════════════════════════
// FinMatrix — screen models → PDF document shapes
// ═══════════════════════════════════════════════════════
// The estimate and sales-order PDF builders were written against the older
// shapes in `types/` (issueDate, soNumber, line `amount`, a status set without
// 'converted' or 'invoiced'), while the screens hold the API-shaped models in
// `models/`. These adapters are the one place the two meet, so a detail
// screen can hand its record straight to the share helpers.

import type { Estimate as EstimateModel } from '../models/estimateModel';
import type { SalesOrder as SalesOrderModel } from '../models/salesOrderModel';
import type { Estimate, EstimateStatus, SalesOrder, SalesOrderStatus } from '../types';

/** A converted estimate was accepted — that is what its PDF should say. */
const ESTIMATE_STATUS: Record<EstimateModel['status'], EstimateStatus> = {
  draft: 'draft',
  sent: 'sent',
  accepted: 'accepted',
  declined: 'declined',
  expired: 'expired',
  converted: 'accepted',
};

const SALES_ORDER_STATUS: Record<SalesOrderModel['status'], SalesOrderStatus> = {
  open: 'open',
  partial: 'partially_fulfilled',
  fulfilled: 'fulfilled',
  invoiced: 'closed',
  cancelled: 'closed',
};

export const estimateForPdf = (e: EstimateModel): Estimate => ({
  id: e.id,
  companyId: '',
  estimateNumber: e.estimateNumber,
  customerId: e.customerId,
  customerName: e.customerName,
  issueDate: e.estimateDate,
  expirationDate: e.expiryDate ?? '',
  status: ESTIMATE_STATUS[e.status] ?? 'draft',
  lines: e.lines.map((l, i) => ({
    id: l.id ?? String(i),
    itemId: l.itemId,
    itemName: l.description,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    amount: l.lineTotal,
  })),
  subtotal: e.subtotal,
  taxAmount: e.taxAmount,
  discountType: e.discountType,
  discountValue: e.discountValue,
  discountAmount: e.discountAmount,
  total: e.total,
  notes: e.notes,
  createdBy: '',
  createdAt: '',
  updatedAt: '',
});

export const salesOrderForPdf = (o: SalesOrderModel): SalesOrder => ({
  id: o.id,
  companyId: '',
  soNumber: o.orderNumber,
  customerId: o.customerId,
  customerName: o.customerName,
  orderDate: o.orderDate,
  expectedDate: o.expectedDate ?? '',
  status: SALES_ORDER_STATUS[o.status] ?? 'open',
  lines: o.lines.map((l, i) => ({
    id: l.id ?? String(i),
    itemId: l.itemId,
    itemName: l.description,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    amount: l.lineTotal,
    fulfilledQuantity: l.quantityFulfilled,
  })),
  subtotal: o.subtotal,
  taxAmount: o.taxAmount,
  total: o.total,
  notes: o.notes,
  createdBy: '',
  createdAt: '',
  updatedAt: '',
});
