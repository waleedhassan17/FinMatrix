// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary serializer
// ═══════════════════════════════════════════════════════
// GET /reports/day-summary, /entries and /schedule → models. Every field is
// coerced rather than trusted: a missing number is 0, never NaN. The same
// mapping as the website's serializers/daySummarySerializer.

import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import {
  DAY_DOC_KINDS,
  type DayDocKind,
  type DayEntriesPage,
  type DayEntryFilter,
  type DayFigure,
  type DayKpi,
  type DayPartyRow,
  type DayPurchasing,
  type DaySummary,
  type DaySummarySchedule,
} from '../models/daySummaryModel';
import { DAY_ITEM_COMPARES, type DayItemCompare, type DayItemSheet } from '../models/dayItemSheetModel';

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const int = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
};
// TypeORM sends DECIMAL columns as strings ("125000.0000"); Number reads both.
const money = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const isKind = (v: unknown): v is DayDocKind =>
  typeof v === 'string' && (DAY_DOC_KINDS as readonly string[]).includes(v);

const figure = (v: unknown): DayFigure => {
  const r = obj(v);
  return { count: int(r.count), total: money(r.total) };
};

const kpi = (v: unknown): DayKpi => {
  const r = obj(v);
  return {
    ...figure(r),
    previousDay: figure(r.previousDay),
    sameDayLastWeek: figure(r.sameDayLastWeek),
    trend: arr(r.trend).map(money),
  };
};

const party = (fallback: string) => (v: unknown): DayPartyRow => {
  const c = obj(v);
  return { id: str(c.id), name: str(c.name, fallback), ...figure(c) };
};

const purchasing = (v: unknown): DayPurchasing | null => {
  if (!v || typeof v !== 'object') return null;
  const r = obj(v);
  const pos = r.position ? obj(r.position) : null;
  const overdue = pos ? obj(pos.overdue) : {};
  return {
    placed: figure(r.placed),
    received: figure(r.received),
    billed: figure(r.billed),
    topVendors: arr(r.topVendors).map(party('Unnamed supplier')),
    position: pos
      ? {
          open: figure(pos.open),
          overdue: { ...figure(overdue), oldest: strOrNull(overdue.oldest) },
          receivedNotBilled: figure(pos.receivedNotBilled),
        }
      : null,
  };
};

const person = (v: unknown): { id: string; name: string } | null => {
  const r = obj(v);
  const id = strOrNull(r.id);
  return id ? { id, name: str(r.name, 'Unnamed') } : null;
};

export const daySummarySerializer = (payload: unknown): DaySummary => {
  const r = obj(unwrapEnvelope(payload));
  const headline = obj(r.headline);
  const scope = obj(r.scope);
  const sales = obj(r.sales);
  const cash = obj(r.cash);
  const attention = obj(r.attention);
  const profit = r.profit ? obj(r.profit) : null;
  return {
    date: str(r.date),
    today: str(r.today),
    timezone: str(r.timezone, 'Asia/Karachi'),
    currency: str(r.currency, 'PKR'),
    scope: { ownOnly: scope.ownOnly === true, createdBy: person(scope.createdBy) },
    kinds: arr(r.kinds).filter(isKind),
    headline: {
      sales: kpi(headline.sales),
      received: kpi(headline.received),
      orders: headline.orders ? kpi(headline.orders) : null,
      purchases: kpi(headline.purchases),
      purchaseOrders: headline.purchaseOrders ? kpi(headline.purchaseOrders) : null,
      goodsReceived: headline.goodsReceived ? kpi(headline.goodsReceived) : null,
    },
    trendDates: arr(r.trendDates).map((d) => str(d)),
    documents: arr(r.documents)
      .map(obj)
      .filter((d) => isKind(d.kind))
      .map((d) => ({ kind: d.kind as DayDocKind, ...figure(d) })),
    sales: {
      subtotal: money(sales.subtotal),
      discount: money(sales.discount),
      tax: money(sales.tax),
      total: money(sales.total),
      unpaid: money(sales.unpaid),
      returns: money(sales.returns),
      // An older server sends no `net`: nothing was netted, so it is the total.
      net: sales.net === undefined ? money(sales.total) : money(sales.net),
    },
    cash: {
      methods: arr(cash.methods)
        .map(obj)
        .map((m) => ({ method: str(m.method, 'other'), received: money(m.received), paid: money(m.paid) })),
      received: money(cash.received),
      paid: money(cash.paid),
      net: money(cash.net),
    },
    topCustomers: arr(r.topCustomers).map(party('Unnamed customer')),
    topItems: arr(r.topItems)
      .map(obj)
      .map((i) => ({
        itemId: strOrNull(i.itemId),
        name: str(i.name, 'Item'),
        quantity: money(i.quantity),
        total: money(i.total),
      })),
    hourly: (() => {
      const byHour = new Map(arr(r.hourly).map(obj).map(h => [int(h.hour), h]));
      return Array.from({ length: 24 }, (_, hour) => {
        const h = byHour.get(hour) ?? {};
        return {
          hour,
          sales: money(h.sales),
          salesCount: int(h.salesCount),
          received: money(h.received),
          receivedCount: int(h.receivedCount),
        };
      });
    })(),
    team: Array.isArray(r.team)
      ? r.team.map(obj).map((t) => ({
          userId: strOrNull(t.userId),
          name: str(t.name, 'Unnamed'),
          invoices: figure(t.invoices),
          salesOrders: figure(t.salesOrders),
          estimates: figure(t.estimates),
          receipts: figure(t.receipts),
          purchaseOrders: figure(t.purchaseOrders),
          documents: int(t.documents),
        }))
      : null,
    members: Array.isArray(r.members)
      ? r.members.map(obj).map((m) => ({ id: str(m.id), name: str(m.name, 'Unnamed'), role: str(m.role) }))
      : null,
    profit: profit
      ? {
          revenue: money(profit.revenue),
          cogs: money(profit.cogs),
          grossProfit: money(profit.grossProfit),
          expenses: money(profit.expenses),
          netIncome: money(profit.netIncome),
        }
      : null,
    attention: {
      backdated: int(attention.backdated),
      drafts: int(attention.drafts),
      cancelledOrders: int(attention.cancelledOrders),
      voided: attention.voided ? figure(attention.voided) : null,
    },
    purchasing: purchasing(r.purchasing),
    isEmpty: r.isEmpty === true,
    generatedAt: str(r.generatedAt),
  };
};

export const dayEntriesSerializer = (payload: unknown): DayEntriesPage => {
  const r = obj(unwrapEnvelope(payload));
  return {
    date: str(r.date),
    filter: (str(r.filter, 'all') as DayEntryFilter) || 'all',
    items: arr(r.items)
      .map(obj)
      .filter((e) => isKind(e.kind))
      .map((e) => ({
        kind: e.kind as DayDocKind,
        id: str(e.id),
        number: strOrNull(e.number),
        date: str(e.date),
        createdAt: str(e.createdAt),
        partyId: strOrNull(e.partyId),
        partyName: strOrNull(e.partyName),
        amount: money(e.amount),
        status: strOrNull(e.status),
        createdBy: person(e.createdBy),
        backdated: e.backdated === true,
        counted: e.counted !== false,
        deleted: e.deleted === true,
      })),
    total: int(r.total),
    countedTotal: money(r.countedTotal),
    excludedTotal: money(r.excludedTotal),
    q: strOrNull(r.q),
    page: int(r.page) || 1,
    limit: int(r.limit) || 50,
    pages: int(r.pages),
  };
};

export const dayScheduleSerializer = (payload: unknown): DaySummarySchedule => {
  const r = obj(unwrapEnvelope(payload));
  const hour = int(r.hour);
  return {
    enabled: r.enabled === true,
    hour: hour >= 0 && hour <= 23 ? hour : 21,
    email: r.email !== false,
    timezone: str(r.timezone, 'Asia/Karachi'),
    lastSent: strOrNull(r.lastSent),
  };
};

const moneyOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : money(v));
const lineKind = (v: unknown): 'item' | 'service' => (v === 'service' ? 'service' : 'item');

/** GET /reports/day-summary/items → the item-wise sales sheet. */
export const dayItemSheetSerializer = (payload: unknown): DayItemSheet => {
  const r = obj(unwrapEnvelope(payload));
  const scope = obj(r.scope);
  const totals = obj(r.totals);
  const tie = obj(r.reconciliation);
  const compare = (DAY_ITEM_COMPARES as readonly string[]).includes(String(r.compare))
    ? (r.compare as DayItemCompare)
    : null;
  return {
    from: str(r.from),
    to: str(r.to, str(r.from)),
    today: str(r.today),
    currency: str(r.currency, 'PKR'),
    scope: { ownOnly: scope.ownOnly === true, createdBy: person(scope.createdBy) },
    compare,
    compareFrom: strOrNull(r.compareFrom),
    compareTo: strOrNull(r.compareTo),
    rows: arr(r.rows)
      .map(obj)
      .map(x => ({
        kind: lineKind(x.kind),
        itemId: strOrNull(x.itemId),
        code: strOrNull(x.code),
        name: str(x.name, 'Item'),
        unit: strOrNull(x.unit),
        category: strOrNull(x.category),
        agency: strOrNull(x.agency),
        sold: money(x.sold),
        free: money(x.free),
        returned: money(x.returned),
        net: money(x.net),
        value: money(x.value),
        returnsValue: money(x.returnsValue),
        cost: moneyOrNull(x.cost),
        profit: moneyOrNull(x.profit),
        margin: moneyOrNull(x.margin),
        costMissing: x.costMissing === true,
        compareValue: moneyOrNull(x.compareValue),
      })),
    compareOnly: arr(r.compareOnly)
      .map(obj)
      .map(x => ({
        kind: lineKind(x.kind),
        itemId: strOrNull(x.itemId),
        name: str(x.name, 'Item'),
        category: strOrNull(x.category),
        agency: strOrNull(x.agency),
        compareValue: money(x.compareValue),
      })),
    totals: {
      lines: int(totals.lines),
      sold: money(totals.sold),
      free: money(totals.free),
      returned: money(totals.returned),
      net: money(totals.net),
      value: money(totals.value),
      returnsValue: money(totals.returnsValue),
      cost: moneyOrNull(totals.cost),
      profit: moneyOrNull(totals.profit),
      margin: moneyOrNull(totals.margin),
      compareValue: moneyOrNull(totals.compareValue),
    },
    hasFree: r.hasFree === true,
    showCost: r.showCost === true,
    reconciliation: {
      salesBeforeTax: money(tie.salesBeforeTax),
      returns: money(tie.returns),
      netSales: money(tie.netSales),
      matches: tie.matches === true,
    },
    reorder: Array.isArray(r.reorder)
      ? r.reorder.map(obj).map(x => ({
          itemId: str(x.itemId),
          code: str(x.code),
          name: str(x.name, 'Item'),
          unit: strOrNull(x.unit),
          onHand: money(x.onHand),
          reorderPoint: money(x.reorderPoint),
          reorderQuantity: money(x.reorderQuantity),
          outOfStock: x.outOfStock === true,
        }))
      : null,
    generatedAt: str(r.generatedAt),
  };
};
