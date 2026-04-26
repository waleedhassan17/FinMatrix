// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/purchase-orders
// All endpoints return envelopes `{ success, data: { ... } }`
// Mirrors `billNetwork.ts` / `glNetwork.ts`.

import { simulateApiCall } from './apiHelpers';
import { purchaseOrders as seedPOs } from '../dummy-data/purchaseOrders';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types';
import type {
  PurchaseOrderApiEntity,
  PurchaseOrderApiPagination,
  PurchaseOrderQueryParams,
} from '../models/purchaseOrderModel';

// ─── In-memory store ─────────────────────────────────
let poStore: PurchaseOrderApiEntity[] = seedPOs.map(p => ({
  ...p,
  lines: p.lines.map(l => ({ ...l })),
})) as PurchaseOrderApiEntity[];

const clonePO = (p: PurchaseOrderApiEntity): PurchaseOrderApiEntity => ({
  ...p,
  lines: p.lines.map(l => ({ ...l })),
});

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// Purchase Order APIs (envelope-wrapped)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/purchase-orders
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/purchase-orders`, { params });
 * return r.data;
 */
export const getPurchaseOrdersAPI = async (
  params: PurchaseOrderQueryParams = {},
): Promise<any> => {
  let filtered = poStore.map(clonePO);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      p =>
        p.poNumber.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(p => p.status === params.status);
  }

  if (params.vendorId) {
    filtered = filtered.filter(p => p.vendorId === params.vendorId);
  }

  // Sort newest-first
  filtered.sort(
    (a, b) =>
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
  );

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: PurchaseOrderApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  // Aggregate counts/totals across the FULL store
  const counts: Record<'all' | PurchaseOrderStatus, number> = {
    all: poStore.length,
    draft: poStore.filter(p => p.status === 'draft').length,
    sent: poStore.filter(p => p.status === 'sent').length,
    partially_received: poStore.filter(p => p.status === 'partially_received').length,
    fully_received: poStore.filter(p => p.status === 'fully_received').length,
    closed: poStore.filter(p => p.status === 'closed').length,
  };

  const totalValue = poStore.reduce((s, p) => s + p.total, 0);

  const response: ApiEnvelope<{
    purchaseOrders: PurchaseOrderApiEntity[];
    pagination: PurchaseOrderApiPagination;
    totals: {
      counts: typeof counts;
      totalValue: number;
    };
  }> = {
    success: true,
    data: {
      purchaseOrders: paged,
      pagination,
      totals: { counts, totalValue },
    },
  };

  return simulateApiCall(response, 600);
};

/**
 * GET /api/v1/purchase-orders/:id
 */
export const getPurchaseOrderByIdAPI = async (id: string): Promise<any> => {
  const po = poStore.find(p => p.id === id);
  if (!po) throw new Error('Purchase order not found');
  return simulateApiCall(
    { success: true, data: { purchaseOrder: clonePO(po) } },
    300,
  );
};

/**
 * POST /api/v1/purchase-orders
 */
export const createPurchaseOrderAPI = async (
  data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newPO: PurchaseOrderApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `po_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  poStore.push(newPO);
  return simulateApiCall(
    { success: true, data: { purchaseOrder: clonePO(newPO) } },
    500,
  );
};

/**
 * PUT /api/v1/purchase-orders/:id
 */
export const updatePurchaseOrderAPI = async (
  id: string,
  data: Partial<PurchaseOrder>,
): Promise<any> => {
  const idx = poStore.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Purchase order not found');
  poStore[idx] = {
    ...poStore[idx],
    ...data,
    lines: (data.lines ?? poStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as PurchaseOrderApiEntity;
  return simulateApiCall(
    { success: true, data: { purchaseOrder: clonePO(poStore[idx]) } },
    500,
  );
};

/**
 * DELETE /api/v1/purchase-orders/:id
 */
export const deletePurchaseOrderAPI = async (id: string): Promise<any> => {
  const idx = poStore.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Purchase order not found');
  poStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 300);
};

/**
 * PATCH /api/v1/purchase-orders/:id/status
 */
export const updatePOStatusAPI = async (
  id: string,
  status: PurchaseOrderStatus,
): Promise<any> => {
  const idx = poStore.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Purchase order not found');
  poStore[idx] = {
    ...poStore[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall(
    { success: true, data: { purchaseOrder: clonePO(poStore[idx]) } },
    400,
  );
};

/**
 * POST /api/v1/purchase-orders/:id/receive
 *
 * Records received quantities for one or more lines and
 * automatically transitions the PO status to
 * `partially_received` or `fully_received`.
 */
export const receivePOItemsAPI = async (
  id: string,
  receipts: { lineId: string; receivingQty: number }[],
): Promise<any> => {
  const idx = poStore.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Purchase order not found');

  const po = clonePO(poStore[idx]);
  receipts.forEach(r => {
    const line = po.lines.find(l => l.id === r.lineId);
    if (line) {
      line.receivedQuantity = Math.min(
        line.quantity,
        line.receivedQuantity + r.receivingQty,
      );
    }
  });

  // Transition status
  const allReceived = po.lines.every(l => l.receivedQuantity >= l.quantity);
  const anyReceived = po.lines.some(l => l.receivedQuantity > 0);
  if (allReceived) po.status = 'fully_received';
  else if (anyReceived) po.status = 'partially_received';

  po.updatedAt = new Date().toISOString();
  poStore[idx] = po;

  return simulateApiCall(
    { success: true, data: { purchaseOrder: clonePO(po) } },
    500,
  );
};
