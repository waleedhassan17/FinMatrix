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
  /** Null before the company's cost-history date — see `coverage`. */
  closingValue: number | null;
  valueKnown: boolean;
}

export interface ItemHistoryCoverage {
  quantity: string;
  /** 'exact' | 'partial' | 'unavailable'. */
  value: string;
  /** The first date an item's value can be read for. Null means never. */
  costHistoryFrom: string | null;
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

/** The item as it stands today — stock figures are AS OF NOW. */
export interface ItemFacts {
  category: string;
  unitOfMeasure: string;
  sellingPrice: number;
  unitCost: number;
  qtyOnHand: number;
  stockValue: number;
  reorderPoint: number;
  isActive: boolean;
  /** The last sale of any date, not only in the range. Null: never sold. */
  lastSoldDate: string | null;
}

/** One buyer of the item over the range. */
export interface ItemCustomer {
  customerId: string | null;
  customerName: string;
  unitsSold: number;
  revenue: number;
  grossProfit: number;
}

export interface ItemPerformance {
  itemId: string;
  itemName: string;
  sku: string;
  range: ReportDateRange;
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
  /** Null from a server that predates it — the explorer then shows less. */
  item: ItemFacts | null;
  /** The top buyers over the range, largest first. */
  customers: ItemCustomer[];
  /** Everyone after the top few, folded. */
  otherCustomers: { count: number; unitsSold: number; revenue: number; grossProfit: number };
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
  /** The last sale of any date. Null: never sold, or a server that predates it. */
  lastSoldDate: string | null;
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
    /** GL 1200, all time — what `stockValue` should equal. Null from an older server. */
    ledgerValue: number | null;
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

/** One document line behind an item's figures. */
export interface ItemSalesEntry {
  date: string;
  /** A delivery opens the invoice it raised, so it links like an invoice. */
  docType: 'invoice' | 'delivery' | 'credit_memo';
  docId: string;
  docNumber: string;
  customerId: string | null;
  customerName: string;
  /** Negative on a return. */
  units: number;
  /** Net of tax and the invoice discount. */
  unitPrice: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
  costBasis: string;
  costKnown: boolean;
}

export interface ItemSalesEntries {
  itemId: string;
  range: ReportDateRange;
  entries: ItemSalesEntry[];
  /** Lines in the whole range, not just this page. */
  total: number;
  page: number;
  limit: number;
  /** Over the whole range — equal to the matching months on item-performance. */
  totals: { unitsSold: number; revenue: number; cogs: number; grossProfit: number };
}

// ═══════════════════════════════════════════════════════
// The valuation list
// ═══════════════════════════════════════════════════════
// Kept in step with the web's models/inventoryValuation.ts. Stock is AS OF
// NOW (it ties to the balance sheet); sales cover a PERIOD. One row carries
// both, and ranking, filtering and folding into categories happen here, where
// they can be tested. `/inventory-performance` returns every item, so ranking
// on the phone reorders the whole list — switching needs no request.

const r2 = (n: number): number => Math.round(n * 100) / 100;

export interface ValuationRow {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  qty: number;
  unitCost: number;
  value: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
  lastSoldDate: string | null;
}

/** The performance rows when sent (stock plus sales), else the snapshot. */
export const valuationRows = (
  snapshot: InventoryValuationReport | null | undefined,
  perf: InventoryPerformance | null | undefined,
): ValuationRow[] => {
  if (perf && perf.rows.length > 0) {
    return perf.rows.map(r => ({
      itemId: r.itemId,
      itemName: r.itemName,
      sku: r.sku,
      category: r.category,
      qty: r.qtyOnHand,
      unitCost: r.unitCost,
      value: r.stockValue,
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      cogs: r.cogs,
      grossProfit: r.grossProfit,
      marginPct: r.marginPct,
      lastSoldDate: r.lastSoldDate,
    }));
  }
  return (snapshot?.rows ?? []).map(r => ({
    itemId: r.itemId,
    itemName: r.itemName,
    sku: r.sku,
    category: r.category || 'Uncategorized',
    qty: r.qty,
    unitCost: r.cost,
    value: r.value,
    unitsSold: 0,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    marginPct: null as number | null,
    lastSoldDate: null as string | null,
  }));
};

/** Whether an item sold, or took a return, in the period. */
export const traded = (r: ValuationRow): boolean =>
  r.revenue !== 0 || r.cogs !== 0 || r.unitsSold !== 0;

export type RankKey = 'grossProfit' | 'revenue' | 'marginPct' | 'unitsSold' | 'stockValue';

export const RANK_OPTIONS: { key: RankKey; label: string }[] = [
  { key: 'grossProfit', label: 'Gross profit' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'marginPct', label: 'Margin' },
  { key: 'unitsSold', label: 'Units' },
  { key: 'stockValue', label: 'Stock' },
];

export const rankFigure = (r: ValuationRow, key: RankKey): number | null => {
  switch (key) {
    case 'revenue':
      return r.revenue;
    case 'marginPct':
      return r.marginPct;
    case 'unitsSold':
      return r.unitsSold;
    case 'stockValue':
      return r.value;
    case 'grossProfit':
    default:
      return r.grossProfit;
  }
};

/**
 * The items a ranking is about, largest first. Sales rankings cover the items
 * that traded; stock value covers everything held, sold or not — unsold stock
 * is exactly what it should surface. Nulls go last.
 */
export const rankRows = (rows: readonly ValuationRow[], key: RankKey): ValuationRow[] =>
  rows
    .filter(r => (key === 'stockValue' ? r.value !== 0 : traded(r)))
    .filter(r => rankFigure(r, key) !== null)
    .sort((a, b) => (rankFigure(b, key) as number) - (rankFigure(a, key) as number));

export type StockFilter = 'all' | 'belowCost' | 'unsold' | 'outOfStock';

export const STOCK_FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'belowCost', label: 'Below cost' },
  { key: 'unsold', label: 'Not sold' },
  { key: 'outOfStock', label: 'Out of stock' },
];

export const matchesFilter = (r: ValuationRow, filter: StockFilter): boolean => {
  switch (filter) {
    case 'belowCost':
      return traded(r) && r.grossProfit < 0;
    case 'unsold':
      return r.qty > 0 && r.unitsSold <= 0;
    case 'outOfStock':
      return r.qty <= 0;
    case 'all':
    default:
      return true;
  }
};

export const filterRows = (
  rows: readonly ValuationRow[],
  q: { search: string; category: string; filter: StockFilter },
): ValuationRow[] => {
  const needle = q.search.trim().toLowerCase();
  return rows.filter(
    r =>
      (!needle || r.itemName.toLowerCase().includes(needle) || r.sku.toLowerCase().includes(needle)) &&
      (!q.category || r.category === q.category) &&
      matchesFilter(r, q.filter),
  );
};

/** Totals of whatever rows are showing — a filtered list foots to itself. */
export const rowTotals = (rows: readonly ValuationRow[]) => {
  const revenue = r2(rows.reduce((t, r) => t + r.revenue, 0));
  const cogs = r2(rows.reduce((t, r) => t + r.cogs, 0));
  const grossProfit = r2(revenue - cogs);
  return {
    value: r2(rows.reduce((t, r) => t + r.value, 0)),
    unitsSold: Math.round(rows.reduce((t, r) => t + r.unitsSold, 0) * 10_000) / 10_000,
    revenue,
    cogs,
    grossProfit,
    marginPct: revenue > 0 ? r2((grossProfit / revenue) * 100) : (null as number | null),
  };
};

/** On hand, and nothing sold in the period: capital sitting still. */
export const unsoldStock = (rows: readonly ValuationRow[]) => {
  const idle = rows.filter(r => matchesFilter(r, 'unsold'));
  return { count: idle.length, value: r2(idle.reduce((t, r) => t + r.value, 0)) };
};

export interface CategoryShare {
  category: string;
  value: number;
  items: number;
  /** 0..1 of all stock value. */
  share: number;
}

/** Stock value by category, largest first. */
export const categoryShares = (rows: readonly ValuationRow[]): CategoryShare[] => {
  const by = new Map<string, { value: number; items: number }>();
  for (const r of rows) {
    const c = by.get(r.category) ?? { value: 0, items: 0 };
    c.value += r.value;
    c.items += 1;
    by.set(r.category, c);
  }
  const total = [...by.values()].reduce((t, c) => t + c.value, 0);
  return [...by.entries()]
    .map(([category, c]) => ({
      category,
      value: r2(c.value),
      items: c.items,
      share: total > 0 ? c.value / total : 0,
    }))
    .sort((a, b) => b.value - a.value || a.category.localeCompare(b.category));
};

/**
 * Whether the stock agrees with Inventory 1200 — within a rupee, the
 * rounding bound of quantity × a four-place average. Null when the server did
 * not say what the ledger holds.
 */
export const ledgerTie = (stockValue: number, ledgerValue: number | null) => {
  if (ledgerValue === null) return null;
  const difference = r2(stockValue - ledgerValue);
  return { ledgerValue, difference, ties: Math.abs(difference) < 1 };
};

/** "34.2%", "<0.1%". */
export const formatShare = (share: number): string => {
  if (share <= 0) return '0%';
  if (share < 0.001) return '<0.1%';
  return `${(share * 100).toFixed(1)}%`;
};
