// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean, UI-ready data structure.

import type {
  SalesOrder,
  SalesOrderLine,
  SalesOrderStatus,
} from '../types';
import type { SalesOrderApiEntity, SalesOrderApiLine } from '../models/salesOrderModel';

// ─── Output shapes for the slice ─────────────────────
export interface SerializedSalesOrderList {
  salesOrders: SalesOrder[];
  page: number;
  totalPages: number;
  totalSalesOrders: number;
}

// ─── Raw → UI mappers ────────────────────────────────
export const mapSalesOrderLine = (raw: Partial<SalesOrderApiLine>): SalesOrderLine => ({
  id: raw.id ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  description: raw.description ?? '',
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : 0,
  taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : 0,
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
  fulfilledQuantity: typeof raw.fulfilledQuantity === 'number' ? raw.fulfilledQuantity : 0,
});

export const mapSalesOrder = (raw: Partial<SalesOrderApiEntity>): SalesOrder => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  soNumber: raw.soNumber ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? '',
  orderDate: raw.orderDate ?? '',
  expectedDate: raw.expectedDate ?? '',
  status: (raw.status ?? 'open') as SalesOrderStatus,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapSalesOrderLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function salesOrderListSerializer(payload: any): SerializedSalesOrderList {
  const data = payload?.data || {};
  const raw: any[] = Array.isArray(data.salesOrders) ? data.salesOrders : [];
  const pagination = data.pagination || {};

  return {
    salesOrders: raw.map(mapSalesOrder),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalSalesOrders: pagination.total ?? raw.length,
  };
}

export function salesOrderSingleSerializer(payload: any): SalesOrder | null {
  const raw = payload?.data?.salesOrder;
  if (!raw) return null;
  return mapSalesOrder(raw);
}
