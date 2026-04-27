// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Model & Validation
// ═══════════════════════════════════════════════════════
// Mirrors `glModel.ts` / `billModel.ts`:
//   • API entity types describing the raw backend shape
//   • Pagination envelope
//   • Query params for the list endpoint
// Plus the existing form-validation helpers used by the form screen.

import type { InventoryItemData } from '../dummy-data/inventoryItems';

// ─── Raw API entity (backend shape) ──────────────────
// 1-to-1 with the `InventoryItemData` UI type today; defined as an alias
// so future backend-only fields can be added without leaking into UI.
export type InventoryApiEntity = InventoryItemData;

// ─── Pagination envelope ─────────────────────────────
export interface InventoryApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params for list endpoint ──────────────────
export type StockFilterParam = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryQueryParams {
  search?: string;
  stockFilter?: StockFilterParam;
  category?: string;
  agencyId?: string;
  page?: number;
  limit?: number;
}

// ─── Re-export the canonical UI type for convenience ─
export type { InventoryItemData };

export interface ValidationErrors {
  [key: string]: string;
}

export interface InventoryFormData {
  // Basic Info
  name: string;
  sku: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  // Pricing
  costMethod: string;
  unitCost: string;
  sellingPrice: string;
  // Stock
  quantityOnHand: string;
  reorderPoint: string;
  reorderQuantity: string;
  minStock: string;
  maxStock: string;
  // Tracking
  serialTracking: boolean;
  lotTracking: boolean;
  barcodeData: string;
  // Location
  locationId: string;
  sourceAgencyId: string;
  isActive: boolean;
}

export const CATEGORY_OPTIONS = [
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Office Supplies', value: 'Office Supplies' },
  { label: 'Furniture', value: 'Furniture' },
  { label: 'Cleaning Supplies', value: 'Cleaning Supplies' },
  { label: 'Packaging', value: 'Packaging' },
  { label: 'Cooking Oil', value: 'Cooking Oil' },
  { label: 'Bottled Water', value: 'Bottled Water' },
  { label: 'Detergent', value: 'Detergent' },
];

export const UOM_OPTIONS = [
  { label: 'Unit', value: 'Unit' },
  { label: 'Piece', value: 'Piece' },
  { label: 'Box', value: 'Box' },
  { label: 'Pack', value: 'Pack' },
  { label: 'Bottle', value: 'Bottle' },
  { label: 'Can', value: 'Can' },
  { label: 'Tin', value: 'Tin' },
  { label: 'Roll', value: 'Roll' },
  { label: 'Ream', value: 'Ream' },
  { label: 'Set', value: 'Set' },
  { label: 'Case', value: 'Case' },
  { label: 'Bag', value: 'Bag' },
  { label: 'Cartridge', value: 'Cartridge' },
];

export const COST_METHOD_OPTIONS = [
  { label: 'FIFO', value: 'FIFO' },
  { label: 'LIFO', value: 'LIFO' },
  { label: 'Weighted Average', value: 'Weighted Average' },
];

export const LOCATION_OPTIONS = [
  { label: 'Main Office', value: 'loc-main' },
  { label: 'Warehouse', value: 'loc-warehouse' },
];

export const generateNextSKU = (existingSKUs: string[], category: string): string => {
  const prefixMap: Record<string, string> = {
    Electronics: 'ELC',
    'Office Supplies': 'OFS',
    Furniture: 'FRN',
    'Cleaning Supplies': 'CLN',
    Packaging: 'PKG',
    'Cooking Oil': 'COK',
    'Bottled Water': 'BTW',
    Detergent: 'DET',
  };
  const prefix = prefixMap[category] || 'ITM';
  const matching = existingSKUs.filter(s => s.startsWith(prefix));
  const num = matching.length + 1;
  return `${prefix}-${String(num).padStart(3, '0')}`;
};

export const validateInventoryItem = (
  data: InventoryFormData,
  existingSKUs: string[],
  editingId?: string,
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Name
  if (!data.name.trim()) {
    errors.name = 'Item name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  // SKU
  if (!data.sku.trim()) {
    errors.sku = 'SKU is required';
  } else if (existingSKUs.includes(data.sku.trim()) && !editingId) {
    errors.sku = 'SKU already exists';
  }

  // Category
  if (!data.category) {
    errors.category = 'Category is required';
  }

  // Unit Cost
  const cost = parseFloat(data.unitCost);
  if (!data.unitCost.trim()) {
    errors.unitCost = 'Unit cost is required';
  } else if (isNaN(cost) || cost < 0) {
    errors.unitCost = 'Enter a valid cost';
  }

  // Selling Price
  const price = parseFloat(data.sellingPrice);
  if (!data.sellingPrice.trim()) {
    errors.sellingPrice = 'Selling price is required';
  } else if (isNaN(price) || price < 0) {
    errors.sellingPrice = 'Enter a valid price';
  }

  // Quantity
  const qty = parseFloat(data.quantityOnHand);
  if (!data.quantityOnHand.trim()) {
    errors.quantityOnHand = 'Quantity is required';
  } else if (isNaN(qty) || qty < 0) {
    errors.quantityOnHand = 'Enter a valid quantity';
  }

  return errors;
};
