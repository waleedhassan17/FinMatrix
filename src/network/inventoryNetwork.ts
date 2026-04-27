// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/inventory
// All endpoints return the standard envelope
// `{ success, data: { ... } }` (mirrors glNetwork / billNetwork).

import { simulateApiCall } from './apiHelpers';
import { allInventoryItems, type InventoryItemData } from '../dummy-data/inventoryItems';
import type {
  InventoryApiEntity,
  InventoryApiPagination,
  InventoryQueryParams,
} from '../models/inventoryModel';

// ─── In-memory store ─────────────────────────────────
let items: InventoryApiEntity[] = [...allInventoryItems];

const cloneItem = (i: InventoryApiEntity): InventoryApiEntity => ({ ...i });

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// Inventory APIs (envelope-wrapped)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/inventory
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/inventory`, { params });
 * return r.data;
 */
export const getInventoryItemsAPI = async (
  params: InventoryQueryParams = {},
): Promise<any> => {
  let filtered = items.map(cloneItem);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }
  if (params.stockFilter && params.stockFilter !== 'all') {
    filtered = filtered.filter(i => {
      if (params.stockFilter === 'out_of_stock') return i.quantityOnHand === 0;
      if (params.stockFilter === 'low_stock')
        return i.quantityOnHand > 0 && i.quantityOnHand <= i.reorderPoint;
      if (params.stockFilter === 'in_stock')
        return i.quantityOnHand > i.reorderPoint;
      return true;
    });
  }
  if (params.category && params.category !== 'all') {
    filtered = filtered.filter(i => i.category === params.category);
  }
  if (params.agencyId && params.agencyId !== 'all') {
    filtered = filtered.filter(i => i.sourceAgencyId === params.agencyId);
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = filtered.slice((page - 1) * limit, page * limit);

  // Counts for tab badges (computed over full store, not filtered slice)
  const counts = {
    all: items.length,
    in_stock: items.filter(i => i.quantityOnHand > i.reorderPoint).length,
    low_stock: items.filter(
      i => i.quantityOnHand > 0 && i.quantityOnHand <= i.reorderPoint,
    ).length,
    out_of_stock: items.filter(i => i.quantityOnHand === 0).length,
  };

  const totalStockValue = items.reduce(
    (s, i) => s + i.quantityOnHand * i.unitCost,
    0,
  );

  const envelope: ApiEnvelope<{
    items: InventoryApiEntity[];
    pagination: InventoryApiPagination;
    totals: { counts: typeof counts; totalStockValue: number };
  }> = {
    success: true,
    data: {
      items: slice,
      pagination: { page, limit, total, totalPages },
      totals: { counts, totalStockValue },
    },
  };
  return simulateApiCall(envelope, 800);
};

/**
 * GET /api/v1/inventory/:id
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/inventory/${id}`);
 * return r.data;
 */
export const getInventoryItemByIdAPI = async (itemId: string): Promise<any> => {
  const item = items.find(i => i.itemId === itemId);
  if (!item) throw new Error('Item not found');
  const envelope: ApiEnvelope<{ item: InventoryApiEntity }> = {
    success: true,
    data: { item: cloneItem(item) },
  };
  return simulateApiCall(envelope, 400);
};

/**
 * POST /api/v1/inventory
 *
 * ★ REAL API:
 * const r = await axios.post(`${API_BASE_URL}/v1/inventory`, data);
 * return r.data;
 */
export const createInventoryItemAPI = async (
  data: Omit<InventoryItemData, 'itemId' | 'lastUpdated'>,
): Promise<any> => {
  const now = new Date().toISOString();
  const newItem: InventoryApiEntity = {
    ...data,
    itemId: `inv-${Date.now()}`,
    lastUpdated: now,
  };
  items.push(newItem);
  const envelope: ApiEnvelope<{ item: InventoryApiEntity }> = {
    success: true,
    data: { item: cloneItem(newItem) },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * PATCH /api/v1/inventory/:id
 *
 * ★ REAL API:
 * const r = await axios.patch(`${API_BASE_URL}/v1/inventory/${id}`, data);
 * return r.data;
 */
export const updateInventoryItemAPI = async (
  itemId: string,
  data: Partial<InventoryItemData>,
): Promise<any> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = { ...items[idx], ...data, lastUpdated: new Date().toISOString() };
  const envelope: ApiEnvelope<{ item: InventoryApiEntity }> = {
    success: true,
    data: { item: cloneItem(items[idx]) },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * POST /api/v1/inventory/:id/adjust-stock
 *
 * ★ REAL API:
 * const r = await axios.post(`${API_BASE_URL}/v1/inventory/${id}/adjust-stock`, { quantityChange });
 * return r.data;
 */
export const adjustStockAPI = async (
  itemId: string,
  quantityChange: number,
): Promise<any> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = {
    ...items[idx],
    quantityOnHand: Math.max(0, items[idx].quantityOnHand + quantityChange),
    lastUpdated: new Date().toISOString(),
  };
  const envelope: ApiEnvelope<{ item: InventoryApiEntity }> = {
    success: true,
    data: { item: cloneItem(items[idx]) },
  };
  return simulateApiCall(envelope, 400);
};

/**
 * POST /api/v1/inventory/:id/toggle-active
 *
 * ★ REAL API:
 * const r = await axios.post(`${API_BASE_URL}/v1/inventory/${id}/toggle-active`);
 * return r.data;
 */
export const toggleInventoryItemAPI = async (
  itemId: string,
): Promise<any> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = {
    ...items[idx],
    isActive: !items[idx].isActive,
    lastUpdated: new Date().toISOString(),
  };
  const envelope: ApiEnvelope<{ item: InventoryApiEntity }> = {
    success: true,
    data: { item: cloneItem(items[idx]) },
  };
  return simulateApiCall(envelope, 400);
};
