// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `glSerializer.ts` / `billSerializer.ts`.

import type { InventoryItemData, InventoryApiEntity } from '../models/inventoryModel';

// ─── Stock-status counts (for tab badges) ────────────
export type InventoryStockCounts = {
  all: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
};

// ─── Serialized output for the list slice ────────────
export interface SerializedInventoryList {
  items: InventoryItemData[];
  page: number;
  totalPages: number;
  totalItems: number;
  counts: InventoryStockCounts;
  totalStockValue: number;
}

// ─── Helpers ─────────────────────────────────────────
const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ─── Raw → UI mapper ─────────────────────────────────
export const mapInventoryItem = (
  raw: any,
): InventoryItemData => ({
  id: raw.id ?? raw.itemId ?? '',
  itemId: raw.itemId ?? raw.id ?? '',
  companyId: raw.companyId ?? '',
  sku: raw.sku ?? '',
  name: raw.name ?? '',
  description: raw.description ?? '',
  category: raw.category ?? '',
  unitOfMeasure: raw.unitOfMeasure ?? 'Unit',
  costMethod: raw.costMethod ?? 'average',
  unitCost: toNum(raw.unitCost),
  sellingPrice: toNum(raw.sellingPrice),
  quantityOnHand: toNum(raw.quantityOnHand),
  quantityOnOrder: toNum(raw.quantityOnOrder),
  quantityCommitted: toNum(raw.quantityCommitted),
  reorderPoint: toNum(raw.reorderPoint),
  reorderQuantity: toNum(raw.reorderQuantity),
  minStock: toNum(raw.minStock),
  maxStock: toNum(raw.maxStock),
  isActive: raw.isActive ?? true,
  serialTracking: raw.serialTracking ?? false,
  lotTracking: raw.lotTracking ?? false,
  barcodeData: raw.barcodeData ?? '',
  locationId: raw.locationId ?? '',
  sourceAgencyId: raw.sourceAgencyId,
  imageUrl: raw.imageUrl ?? '',
  lastUpdated: raw.updatedAt ?? raw.lastUpdated ?? '',
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

// ─── Envelope serializers ────────────────────────────
export function inventoryListSerializer(payload: any): SerializedInventoryList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const totals = (data && !Array.isArray(data)) ? (data.totals || {}) : {};

  const items = raw.map(mapInventoryItem);

  // Compute counts client-side if not provided.
  const counts: InventoryStockCounts = totals.counts || {
    all: items.length,
    in_stock: items.filter(i => toNum(i.quantityOnHand) > toNum(i.reorderPoint)).length,
    low_stock: items.filter(
      i => toNum(i.quantityOnHand) > 0 && toNum(i.quantityOnHand) <= toNum(i.reorderPoint),
    ).length,
    out_of_stock: items.filter(i => toNum(i.quantityOnHand) === 0).length,
  };

  const totalStockValue =
    typeof totals.totalStockValue === 'number'
      ? totals.totalStockValue
      : items.reduce((s, i) => s + toNum(i.quantityOnHand) * toNum(i.unitCost), 0);

  return {
    items,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalItems: pagination.total ?? items.length,
    counts,
    totalStockValue,
  };
}

export function inventorySingleSerializer(
  payload: any,
): InventoryItemData | null {
  const raw = payload?.data?.item ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapInventoryItem(raw);
}
