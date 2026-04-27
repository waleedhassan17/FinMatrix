// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `glSerializer.ts` / `billSerializer.ts`.

import type { InventoryItemData } from '../dummy-data/inventoryItems';
import type { InventoryApiEntity } from '../models/inventoryModel';

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

// ─── Raw → UI mapper ─────────────────────────────────
export const mapInventoryItem = (
  raw: Partial<InventoryApiEntity>,
): InventoryItemData => ({
  itemId: raw.itemId ?? '',
  companyId: raw.companyId ?? '',
  sku: raw.sku ?? '',
  name: raw.name ?? '',
  description: raw.description ?? '',
  category: raw.category ?? '',
  unitOfMeasure: raw.unitOfMeasure ?? 'Unit',
  costMethod: (raw.costMethod as InventoryItemData['costMethod']) ?? 'FIFO',
  unitCost: typeof raw.unitCost === 'number' ? raw.unitCost : 0,
  sellingPrice: typeof raw.sellingPrice === 'number' ? raw.sellingPrice : 0,
  quantityOnHand: typeof raw.quantityOnHand === 'number' ? raw.quantityOnHand : 0,
  quantityOnOrder: typeof raw.quantityOnOrder === 'number' ? raw.quantityOnOrder : 0,
  quantityCommitted:
    typeof raw.quantityCommitted === 'number' ? raw.quantityCommitted : 0,
  reorderPoint: typeof raw.reorderPoint === 'number' ? raw.reorderPoint : 0,
  reorderQuantity:
    typeof raw.reorderQuantity === 'number' ? raw.reorderQuantity : 0,
  minStock: typeof raw.minStock === 'number' ? raw.minStock : 0,
  maxStock: typeof raw.maxStock === 'number' ? raw.maxStock : 0,
  isActive: raw.isActive ?? true,
  serialTracking: raw.serialTracking ?? false,
  lotTracking: raw.lotTracking ?? false,
  barcodeData: raw.barcodeData ?? '',
  locationId: raw.locationId ?? '',
  sourceAgencyId: raw.sourceAgencyId,
  imageUrl: raw.imageUrl ?? '',
  lastUpdated: raw.lastUpdated ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function inventoryListSerializer(payload: any): SerializedInventoryList {
  const data = payload?.data || {};
  const raw: any[] = Array.isArray(data.items) ? data.items : [];
  const pagination = data.pagination || {};
  const totals = data.totals || {};

  const items = raw.map(mapInventoryItem);

  // Compute counts client-side if not provided.
  const counts: InventoryStockCounts = totals.counts || {
    all: items.length,
    in_stock: items.filter(i => i.quantityOnHand > i.reorderPoint).length,
    low_stock: items.filter(
      i => i.quantityOnHand > 0 && i.quantityOnHand <= i.reorderPoint,
    ).length,
    out_of_stock: items.filter(i => i.quantityOnHand === 0).length,
  };

  const totalStockValue =
    typeof totals.totalStockValue === 'number'
      ? totals.totalStockValue
      : items.reduce((s, i) => s + i.quantityOnHand * i.unitCost, 0);

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
  const raw = payload?.data?.item;
  if (!raw) return null;
  return mapInventoryItem(raw);
}
