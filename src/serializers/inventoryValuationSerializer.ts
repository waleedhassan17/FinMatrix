import type {
  ItemPerformance,
  ItemPerformanceResponse,
  InventoryItemHistory,
  InventoryItemHistoryResponse,
  InventoryValuationReport,
  InventoryValuationReportResponse,
  InventoryValuationTrend,
  InventoryValuationTrendResponse,
} from '../models/inventoryValuationModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

/** Preserves null, which on these series means "not known", never "zero". */
const nOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : null;
};

export const inventoryValuationSerializer = (
  payload: InventoryValuationReportResponse,
): InventoryValuationReport | null => {
  const raw = unwrapEnvelope<InventoryValuationReport>(payload);
  if (!raw) return null;
  return {
    rows: raw.rows ?? [],
    byCategory: raw.byCategory ?? [],
    totalValue: raw.totalValue ?? 0,
  };
};

export const inventoryValuationTrendSerializer = (
  payload: InventoryValuationTrendResponse,
): InventoryValuationTrend | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;
  return {
    months: n(raw.months) || 12,
    points: (raw.points ?? []).map((p: any) => ({
      period: p.period ?? '',
      label: p.label ?? '',
      asOfDate: p.asOfDate ?? '',
      value: n(p.value),
    })),
  };
};

/**
 * One item's stock history.
 *
 * `closingQty` and `closingValue` go through nOrNull rather than n: a null on
 * these series means "not known" and must survive to the chart, which draws a
 * gap for it. Coercing null to 0 here would invent a stockout for every month
 * before the item existed, and a zero valuation for every month whose cost has
 * not been recorded.
 */
export const inventoryItemHistorySerializer = (
  payload: InventoryItemHistoryResponse,
): InventoryItemHistory | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;
  return {
    itemId: raw.itemId ?? '',
    itemName: raw.itemName ?? '',
    sku: raw.sku ?? '',
    months: n(raw.months) || 12,
    points: (raw.points ?? []).map((p: any) => ({
      period: p.period ?? '',
      label: p.label ?? '',
      asOfDate: p.asOfDate ?? '',
      closingQty: nOrNull(p.closingQty),
      qtyIn: n(p.qtyIn),
      qtyOut: n(p.qtyOut),
      closingValue: nOrNull(p.closingValue),
      valueKnown: !!p.valueKnown,
    })),
    coverage: {
      quantity: raw.coverage?.quantity ?? 'exact',
      value: raw.coverage?.value ?? 'unavailable',
      message: raw.coverage?.message ?? '',
    },
  };
};

export const itemPerformanceSerializer = (
  payload: ItemPerformanceResponse,
): ItemPerformance | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;
  return {
    itemId: raw.itemId ?? '',
    itemName: raw.itemName ?? '',
    sku: raw.sku ?? '',
    points: (raw.points ?? []).map((p: any) => ({
      period: p.period ?? '',
      label: p.label ?? '',
      unitsSold: n(p.unitsSold),
      revenue: n(p.revenue),
      cogs: n(p.cogs),
      grossProfit: n(p.grossProfit),
      marginPct: nOrNull(p.marginPct),
      costKnown: p.costKnown !== false,
    })),
    totals: {
      unitsSold: n(raw.totals?.unitsSold),
      revenue: n(raw.totals?.revenue),
      cogs: n(raw.totals?.cogs),
      grossProfit: n(raw.totals?.grossProfit),
      marginPct: nOrNull(raw.totals?.marginPct),
    },
    costHistoryFrom: raw.costHistoryFrom ?? null,
    estimatedCogsShare: n(raw.estimatedCogsShare),
  };
};
