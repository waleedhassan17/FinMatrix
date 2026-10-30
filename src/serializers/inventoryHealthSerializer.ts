import type {
  DatedValuation,
  InventoryHealth,
  StockAgeBucket,
} from '../models/inventoryHealthModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { kpiFrom } from './kpiSerializer';
import { arr, bool, num, numOrNull, str, strOrNull } from './reportValues';

const bucketFrom = (b: any): StockAgeBucket => ({
  key: str(b?.key),
  label: str(b?.label),
  count: num(b?.count),
  value: num(b?.value),
});

/** GET /reports/inventory-health. */
export const inventoryHealthSerializer = (payload: unknown): InventoryHealth | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  const dead = raw.deadStock ?? {};
  return {
    asOfDate: str(raw.asOfDate),
    basis: str(raw.basis),
    belowReorder: arr(raw.belowReorder).map((x: any) => ({
      itemId: str(x?.itemId),
      name: str(x?.name),
      sku: str(x?.sku),
      qtyOnHand: num(x?.qtyOnHand),
      reorderPoint: num(x?.reorderPoint),
      reorderQuantity: num(x?.reorderQuantity),
      suggestedOrderQty: num(x?.suggestedOrderQty),
      stockValue: numOrNull(x?.stockValue),
    })),
    aging: {
      byLastInbound: arr(raw.aging?.byLastInbound).map(bucketFrom),
      byLastOutbound: arr(raw.aging?.byLastOutbound).map(bucketFrom),
    },
    deadStock: {
      thresholdDays: num(dead.thresholdDays) || 180,
      items: arr(dead.items).map((x: any) => ({
        itemId: str(x?.itemId),
        name: str(x?.name),
        sku: str(x?.sku),
        qtyOnHand: num(x?.qtyOnHand),
        stockValue: numOrNull(x?.stockValue),
        lastOutboundDate: strOrNull(x?.lastOutboundDate),
        daysSinceOutbound: numOrNull(x?.daysSinceOutbound),
      })),
      totalValue: num(dead.totalValue),
    },
    turnover: raw.turnover && typeof raw.turnover === 'object' ? kpiFrom(raw.turnover, 'inventoryTurnover') : null,
    dio: raw.dio && typeof raw.dio === 'object' ? kpiFrom(raw.dio, 'dio12') : null,
    byLocation: arr(raw.byLocation).map((x: any) => ({ location: str(x?.location, 'Unassigned') || 'Unassigned', value: num(x?.value) })),
    totals:
      raw.totals && typeof raw.totals === 'object'
        ? {
            itemCount: num(raw.totals.itemCount),
            itemsOnHand: num(raw.totals.itemsOnHand),
            stockValue: num(raw.totals.stockValue),
            valuationTotal: num(raw.totals.valuationTotal),
          }
        : null,
  };
};

/** GET /reports/inventory-valuation?asOfDate — the dated record, never estimated. */
export const datedValuationSerializer = (payload: unknown): DatedValuation | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    asOfDate: str(raw.asOfDate),
    rows: arr(raw.rows).map((r: any) => {
      const value = numOrNull(r?.value);
      return {
        itemId: str(r?.itemId),
        itemName: str(r?.itemName),
        sku: str(r?.sku),
        category: str(r?.category),
        qty: num(r?.qty),
        cost: numOrNull(r?.cost),
        value,
        valueKnown: r?.valueKnown === undefined ? value !== null : bool(r.valueKnown),
      };
    }),
    byCategory: arr(raw.byCategory).map((c: any) => ({ category: str(c?.category), totalValue: num(c?.totalValue) })),
    totalValue: num(raw.totalValue),
    coverage:
      raw.coverage && typeof raw.coverage === 'object'
        ? {
            movements: num(raw.coverage.movements),
            valued: num(raw.coverage.valued),
            pct: num(raw.coverage.pct),
            unvaluedItems: num(raw.coverage.unvaluedItems),
          }
        : null,
    ledgerTie:
      raw.ledgerTie && typeof raw.ledgerTie === 'object'
        ? {
            gl1200: num(raw.ledgerTie.gl1200),
            valuation: num(raw.ledgerTie.valuation),
            gap: num(raw.ledgerTie.gap),
            includesGoodsInTransit: bool(raw.ledgerTie.includesGoodsInTransit),
          }
        : null,
  };
};
