// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `billSerializer.ts` / `glSerializer.ts`.

import type { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from '../types';
import type {
  PurchaseOrderApiEntity,
  PurchaseOrderApiLineEntity,
} from '../models/purchaseOrderModel';

// ─── Serialized output for the list slice ────────────
export interface SerializedPOList {
  purchaseOrders: PurchaseOrder[];
  page: number;
  totalPages: number;
  totalPOs: number;
  counts: Record<'all' | PurchaseOrderStatus, number>;
  totalValue: number;
}

// ─── Raw → UI mappers ────────────────────────────────
const mapPOLine = (raw: Partial<PurchaseOrderApiLineEntity>): PurchaseOrderLine => ({
  id: raw.id ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  description: raw.description ?? '',
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : 0,
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
  receivedQuantity: typeof raw.receivedQuantity === 'number' ? raw.receivedQuantity : 0,
});

export const mapPO = (raw: Partial<PurchaseOrderApiEntity>): PurchaseOrder => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  poNumber: raw.poNumber ?? '',
  vendorId: raw.vendorId ?? '',
  vendorName: raw.vendorName ?? '',
  orderDate: raw.orderDate ?? '',
  expectedDate: raw.expectedDate ?? '',
  status: (raw.status as PurchaseOrderStatus) ?? 'draft',
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapPOLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function purchaseOrderListSerializer(payload: any): SerializedPOList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.purchaseOrders)
      ? data.purchaseOrders
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const totals = (data && !Array.isArray(data)) ? (data.totals || {}) : {};

  const purchaseOrders = raw.map(mapPO);

  // Compute counts client-side if backend didn't provide them.
  const counts: Record<'all' | PurchaseOrderStatus, number> = totals.counts || {
    all: purchaseOrders.length,
    draft: purchaseOrders.filter(p => p.status === 'draft').length,
    sent: purchaseOrders.filter(p => p.status === 'sent').length,
    partially_received: purchaseOrders.filter(p => p.status === 'partially_received').length,
    fully_received: purchaseOrders.filter(p => p.status === 'fully_received').length,
    closed: purchaseOrders.filter(p => p.status === 'closed').length,
  };

  const totalValue =
    typeof totals.totalValue === 'number'
      ? totals.totalValue
      : purchaseOrders.reduce((s, p) => s + p.total, 0);

  return {
    purchaseOrders,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalPOs: pagination.total ?? purchaseOrders.length,
    counts,
    totalValue,
  };
}

export function purchaseOrderSingleSerializer(payload: any): PurchaseOrder | null {
  const raw = payload?.data?.purchaseOrder ?? payload?.data?.po ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapPO(raw);
}
