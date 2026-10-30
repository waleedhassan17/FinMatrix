// ═══════════════════════════════════════════════════════
// FinMatrix — Stock that needs attention
// ═══════════════════════════════════════════════════════
// GET /reports/inventory-health and the dated inventory valuation (reports
// v2). What to reorder, how long stock has sat, what has stopped selling, how
// fast stock turns and where its value sits — all decided on the server. The
// app lists and draws; it does not age, value or total anything.

import type { Kpi } from './kpiModel';

export interface BelowReorderItem {
  itemId: string;
  name: string;
  sku: string;
  qtyOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  /** max(reorder quantity, reorder point − on hand) — the server's. */
  suggestedOrderQty: number;
  /** Null when the dated record carries an unvalued movement. */
  stockValue: number | null;
}

export interface StockAgeBucket {
  /** d0_30 | d31_90 | d91_180 | d180_plus | noMovement */
  key: string;
  label: string;
  count: number;
  value: number;
}

export interface DeadStockItem {
  itemId: string;
  name: string;
  sku: string;
  qtyOnHand: number;
  stockValue: number | null;
  lastOutboundDate: string | null;
  daysSinceOutbound: number | null;
}

export interface InventoryHealth {
  asOfDate: string;
  /** 'onHandAtAverageCost' today; 'movementRecord' for a past date. */
  basis: string;
  belowReorder: BelowReorderItem[];
  aging: { byLastInbound: StockAgeBucket[]; byLastOutbound: StockAgeBucket[] };
  deadStock: { thresholdDays: number; items: DeadStockItem[]; totalValue: number };
  /** KPI objects: inventoryTurnover and dio12, trailing 12 months. */
  turnover: Kpi | null;
  dio: Kpi | null;
  byLocation: { location: string; value: number }[];
  totals: { itemCount: number; itemsOnHand: number; stockValue: number; valuationTotal: number } | null;
}

/** One item in the inventory valuation as of a past date. */
export interface DatedValuationRow {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  qty: number;
  /** The average cost the record implies; null where it implies none. */
  cost: number | null;
  /** Null when a movement in the record carries no value — never estimated. */
  value: number | null;
  valueKnown: boolean;
}

export interface DatedValuation {
  asOfDate: string;
  rows: DatedValuationRow[];
  byCategory: { category: string; totalValue: number }[];
  totalValue: number;
  /** How much of the movement record carries a value. */
  coverage: { movements: number; valued: number; pct: number; unvaluedItems: number } | null;
  /** The total beside GL 1200 at the same date; 1250 Goods in Transit is not included. */
  ledgerTie: { gl1200: number; valuation: number; gap: number; includesGoodsInTransit: boolean } | null;
}

export type StockAgeBasis = 'byLastInbound' | 'byLastOutbound';

export const AGE_BASIS_OPTIONS: { key: StockAgeBasis; label: string }[] = [
  { key: 'byLastInbound', label: 'Since last in' },
  { key: 'byLastOutbound', label: 'Since last out' },
];

/** A paisa either way is the server's rounding; more is a gap. */
export const ledgerTies = (t: DatedValuation['ledgerTie']): boolean | null =>
  t ? Math.abs(t.gap) < 0.005 : null;
