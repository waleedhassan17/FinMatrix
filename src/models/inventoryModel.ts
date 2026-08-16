// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Model & Validation
// ═══════════════════════════════════════════════════════
// Mirrors `glModel.ts` / `billModel.ts`:
//   • API entity types describing the raw backend shape
//   • Pagination envelope
//   • Query params for the list endpoint
// Plus the existing form-validation helpers used by the form screen.

// ─── Raw API entity (backend shape) ──────────────────
export interface InventoryItemData {
  id: string;
  itemId?: string;
  companyId?: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costMethod: string;
  unitCost: number;
  sellingPrice: number;
  quantityOnHand: number;
  quantityOnOrder: number;
  quantityCommitted: number;
  reorderPoint: number;
  reorderQuantity: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  serialTracking: boolean;
  lotTracking: boolean;
  barcodeData: string;
  locationId: string;
  sourceAgencyId?: string;
  sourceAgencyName?: string;
  imageUrl: string;
  lastUpdated: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type InventoryApiEntity = InventoryItemData;

// ─── Write payloads (mirror the API DTOs) ────────────
// Deliberately separate from InventoryItemData, which carries an index
// signature that makes any `Omit<>` of it vacuous — that is how a fake
// `locationId` and blank optional fields reached the API unchecked and 400'd
// every create. These types have no index signature, so a stray field is a
// compile error.
//
// Decimals are strings on purpose: the API validates them with
// @IsNumberString. Optional fields must be OMITTED rather than sent empty —
// its @IsOptional() only skips null/undefined, so '' is still validated and
// fails @Length / @IsNumberString / @IsUUID.
//
// `locationId` is absent by design: the backend has an inventory_locations
// table but no endpoint exposes it, so the app can never hold a real location
// UUID (see LOCATION_OPTIONS below).
export interface CreateInventoryItemPayload {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  /** Weighted average is the only method the API accepts. */
  costMethod?: 'average';
  unitCost?: string;
  sellingPrice?: string;
  reorderPoint?: string;
  reorderQuantity?: string;
  minStock?: string;
  maxStock?: string;
  isActive?: boolean;
  serialTracking?: boolean;
  lotTracking?: boolean;
  barcodeData?: string;
  sourceAgencyId?: string;
}

/** UpdateInventoryItemDto has no `costMethod` field; everything else is
 *  optional there too, including `sku`. */
export type UpdateInventoryItemPayload = Partial<Omit<CreateInventoryItemPayload, 'costMethod'>>;

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
  // Warehouse & status
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

/**
 * Weighted average is the only costing method the backend implements, and the
 * only value its API accepts.
 *
 * These options used to send 'FIFO' / 'LIFO' / 'Weighted Average' — none of
 * which match the API enum ('average'), so every item create and edit from
 * this form was rejected with a 400. The form also defaulted to FIFO, so it
 * failed on every submission.
 */
export const COST_METHOD_OPTIONS = [
  { label: 'Weighted Average', value: 'average' },
];

/**
 * DISPLAY-ONLY client ids — never send these to the API.
 *
 * The backend has an `inventory_locations` table but no endpoint exposes it,
 * so there is no way to obtain a real location UUID. The API validates
 * `locationId` with @IsUUID, so posting 'loc-main' 400s the request; the item
 * form used to default to exactly that and failed every create and edit.
 *
 * Kept only for the screens that still filter on these labels locally.
 */
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

  // Quantity is deliberately NOT validated here, because it is no longer
  // entered here. It used to be a required field that the API silently
  // discarded — the form demanded a number, reported success, and saved zero.
  // Stock now only arrives through a path that posts a journal entry:
  // a Purchase Order receipt, an Opening Stock entry, or a Stock Adjustment.

  return errors;
};

// ─── Empty defaults for screens that reference data locally ──
export const inventoryItemsData: InventoryItemData[] = [];

export interface StockMovement {
  id: string;
  date: string;
  type: string;
  reference: string;
  quantity: number;
  balance: number;
}

export const getStockMovements = (_itemId: string): StockMovement[] => [];
