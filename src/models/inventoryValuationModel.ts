import type { ApiEnvelope, ReportDateRange } from './reportModel';

export interface InventoryValuationRow {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  qty: number;
  cost: number;
  value: number;
}

export interface InventoryValuationCategoryTotal {
  category: string;
  totalValue: number;
}

export interface InventoryValuationReport {
  rows: InventoryValuationRow[];
  byCategory: InventoryValuationCategoryTotal[];
  totalValue: number;
}

export type InventoryValuationReportResponse = ApiEnvelope<InventoryValuationReport>;

/** One month on a trend series. */
export interface ValuationTrendPoint {
  /** 'YYYY-MM' — stable key, unlike the label. */
  period: string;
  /** 'Mar 26'. */
  label: string;
  /** Month end, which is the date the figure closes on. */
  asOfDate: string;
  value: number;
}

/**
 * Company-wide stock value over time.
 *
 * Derived from general ledger account 1200, so every point is exact and ties
 * to the balance sheet — the same identity the acceptance suite already
 * asserts for the current snapshot, extended backwards.
 */
export interface InventoryValuationTrend {
  months: number;
  points: ValuationTrendPoint[];
}

export type InventoryValuationTrendResponse = ApiEnvelope<InventoryValuationTrend>;

/** One month of a single item's stock history. */
export interface ItemHistoryPoint {
  period: string;
  label: string;
  asOfDate: string;
  /**
   * On hand at month end. `null` before the item's first movement — which is
   * "it did not exist yet", a different claim from a zero, which would mean it
   * existed and was out of stock.
   */
  closingQty: number | null;
  qtyIn: number;
  qtyOut: number;
  /** Null until per-movement cost is recorded — see `coverage`. */
  closingValue: number | null;
  valueKnown: boolean;
}

export interface ItemHistoryCoverage {
  quantity: string;
  value: string;
  /** Plain words for the UI, so the gap is stated rather than left blank. */
  message: string;
}

export interface InventoryItemHistory {
  itemId: string;
  itemName: string;
  sku: string;
  months: number;
  points: ItemHistoryPoint[];
  coverage: ItemHistoryCoverage;
}

export type InventoryItemHistoryResponse = ApiEnvelope<InventoryItemHistory>;

/** One month of an item's sales and margin. */
export interface ItemPerformancePoint {
  period: string;
  label: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  /** Null in a month with no sales: a zero margin is a claim about a period
   *  that traded, not about one that did not. */
  marginPct: number | null;
  costKnown: boolean;
}

export interface ItemPerformance {
  itemId: string;
  itemName: string;
  sku: string;
  points: ItemPerformancePoint[];
  totals: {
    unitsSold: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPct: number | null;
  };
  /** First date from which cost is recorded. Null means never. */
  costHistoryFrom: string | null;
  /** 0..1 — how much of the cost above is an apportioned estimate. Each
   *  invoice's total is exact; the split between items on one invoice is not. */
  estimatedCogsShare: number;
}

export type ItemPerformanceResponse = ApiEnvelope<ItemPerformance>;

export type InventoryPerformanceSort =
  | 'grossProfit'
  | 'revenue'
  | 'marginPct'
  | 'stockValue';

/** One item: what it is carrying, and what it earned. */
export interface InventoryPerformanceRow {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  /** Null in a period the item did not trade — not zero. */
  marginPct: number | null;
  /** AS OF NOW, not the period end — these tie to the balance sheet. */
  qtyOnHand: number;
  unitCost: number;
  stockValue: number;
  /** 'posted' exact · 'apportioned' estimated split · 'partial' some unknown. */
  costBasis: string;
}

/** One named reason the item figures differ from the P&L. */
export interface ReconcilingItem {
  label: string;
  revenue: number;
  cogs: number;
  reason: string;
}

export interface InventoryPerformance {
  range: ReportDateRange;
  sort: InventoryPerformanceSort;
  rows: InventoryPerformanceRow[];
  totals: {
    unitsSold: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPct: number | null;
    stockValue: number;
  };
  /**
   * Why this report does not equal the Profit & Loss, itemised.
   *
   * It always foots: itemRevenue + the items' revenue = glRevenue, and the
   * same for cost. Showing the difference and naming it is what lets someone
   * trust the figures above rather than quietly wondering.
   */
  reconciliation: {
    glRevenue: number;
    glCogs: number;
    itemRevenue: number;
    itemCogs: number;
    unallocatedRevenue: number;
    unallocatedCogs: number;
    items: ReconcilingItem[];
    note: string;
  };
  estimatedCogsShare: number;
  costHistoryFrom: string | null;
}

export type InventoryPerformanceResponse = ApiEnvelope<InventoryPerformance>;
