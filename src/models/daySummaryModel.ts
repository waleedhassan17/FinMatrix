// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary model
// ═══════════════════════════════════════════════════════
// GET /reports/day-summary: what the business did on one day. Types, plus the
// pure helpers the screen, its PDF and its share text are built from — one
// set, so the three cannot disagree. Mirrors the website's models/daySummary.

import dayjs from 'dayjs';
import { formatCurrency } from '../utils/formatters';
import type { ReportDoc, ReportDocRow } from '../utils/reportHtml';

export const DAY_DOC_KINDS = [
  'invoice',
  'sales_order',
  'estimate',
  'receipt',
  'credit_memo',
  'bill',
  'purchase_order',
  'vendor_payment',
  'vendor_credit',
] as const;
export type DayDocKind = (typeof DAY_DOC_KINDS)[number];

export const DAY_ENTRY_FILTERS = ['all', 'backdated', 'drafts', 'voided', 'cancelled'] as const;
export type DayEntryFilter = (typeof DAY_ENTRY_FILTERS)[number] | DayDocKind;

export interface DayFigure {
  count: number;
  total: number;
}

export interface DayKpi extends DayFigure {
  previousDay: DayFigure;
  sameDayLastWeek: DayFigure;
  /** The 7 days ending on the summary's date, oldest first. */
  trend: number[];
}

export interface DayDocumentRow extends DayFigure {
  kind: DayDocKind;
}

export interface DayMethodRow {
  method: string;
  received: number;
  paid: number;
}

export interface DayPartyRow extends DayFigure {
  id: string;
  name: string;
}

export interface DayItemRow {
  itemId: string | null;
  name: string;
  quantity: number;
  total: number;
}

export interface DayHourRow {
  /** 0–23, company time. */
  hour: number;
  sales: number;
  salesCount: number;
  received: number;
  receivedCount: number;
}

export interface DayUserRow {
  userId: string | null;
  name: string;
  invoices: DayFigure;
  salesOrders: DayFigure;
  estimates: DayFigure;
  receipts: DayFigure;
  /** Purchase orders placed (not drafts, not withdrawn). */
  purchaseOrders: DayFigure;
  documents: number;
}

/** Where the company's purchase orders stand now — not tied to the day. Owner only. */
export interface DayPurchasePosition {
  /** Sent or partly received: the value still to arrive (tax included, like a PO's total). */
  open: DayFigure;
  /** Of those, expected before today; `oldest` is the earliest expected date. */
  overdue: DayFigure & { oldest: string | null };
  /** Received but not yet billed by the supplier: the POs' GRNI balance. */
  receivedNotBilled: DayFigure;
}

/** The buying side of the day. */
export interface DayPurchasing {
  placed: DayFigure;
  /** Stock received against purchase orders, at cost; `count` is purchase orders. */
  received: DayFigure;
  /** Bills raised from purchase orders, dated the day. */
  billed: DayFigure;
  topVendors: DayPartyRow[];
  position: DayPurchasePosition | null;
}

export interface DayMember {
  id: string;
  name: string;
  role: string;
}

export interface DaySummary {
  date: string;
  today: string;
  timezone: string;
  currency: string;
  scope: { ownOnly: boolean; createdBy: { id: string; name: string } | null };
  kinds: DayDocKind[];
  headline: {
    sales: DayKpi;
    received: DayKpi;
    orders: DayKpi | null;
    purchases: DayKpi;
    /** Purchase orders placed. Null when the plan has none (or an older server). */
    purchaseOrders: DayKpi | null;
    /** Stock received against purchase orders, at cost. */
    goodsReceived: DayKpi | null;
  };
  trendDates: string[];
  documents: DayDocumentRow[];
  sales: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    unpaid: number;
    /** Customer returns (credit memos) dated the day, tax included. */
    returns: number;
    /** total − returns. */
    net: number;
  };
  cash: { methods: DayMethodRow[]; received: number; paid: number; net: number };
  topCustomers: DayPartyRow[];
  topItems: DayItemRow[];
  /** 24 rows: the day's sales and receipts by the hour they were entered. */
  hourly: DayHourRow[];
  team: DayUserRow[] | null;
  members: DayMember[] | null;
  profit: { revenue: number; cogs: number; grossProfit: number; expenses: number; netIncome: number } | null;
  /** cancelledOrders: cancelled sales orders and withdrawn purchase orders. */
  attention: { backdated: number; drafts: number; cancelledOrders: number; voided: DayFigure | null };
  /** Null when the plan has no purchase orders (or an older server). */
  purchasing: DayPurchasing | null;
  isEmpty: boolean;
  generatedAt: string;
}

export interface DayEntry {
  kind: DayDocKind;
  id: string;
  number: string | null;
  date: string;
  createdAt: string;
  partyId: string | null;
  partyName: string | null;
  amount: number;
  status: string | null;
  createdBy: { id: string; name: string } | null;
  backdated: boolean;
  counted: boolean;
  deleted: boolean;
}

export interface DayEntriesPage {
  date: string;
  filter: DayEntryFilter;
  /** The search applied, or null. */
  q: string | null;
  /** This page's rows. */
  items: DayEntry[];
  /** Rows matching the filter and search, across every page. */
  total: number;
  /** Their amounts the day's totals count, across every page. */
  countedTotal: number;
  /** Their amounts the totals leave out (drafts, voids, cancelled). */
  excludedTotal: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DaySummarySchedule {
  enabled: boolean;
  hour: number;
  email: boolean;
  timezone: string;
  lastSent: string | null;
}

// ─── Document types ─────────────────────────────────────────────────────

/** A shared record screen (registered on every tab) and its params. */
export type DayEntryTarget =
  | { screen: 'InvoiceDetail'; params: { invoiceId: string } }
  | { screen: 'SalesOrderDetail'; params: { salesOrderId: string } }
  | { screen: 'EstimateDetail'; params: { estimateId: string } }
  | { screen: 'CreditMemoDetail'; params: { creditMemoId: string } }
  | { screen: 'BillDetail'; params: { billId: string } }
  | { screen: 'PODetail'; params: { poId: string } }
  | { screen: 'VendorCreditDetail'; params: { vendorCreditId: string } }
  | { screen: 'CustomerDetail'; params: { customerId: string } }
  | { screen: 'VendorDetail'; params: { vendorId: string } };

export interface KindMeta {
  label: string;
  one: string;
  many: string;
  icon: string;
}

export const KIND_META: Record<DayDocKind, KindMeta> = {
  invoice: { label: 'Invoices', one: 'invoice', many: 'invoices', icon: 'file-text' },
  sales_order: { label: 'Sales orders', one: 'sales order', many: 'sales orders', icon: 'clipboard' },
  estimate: { label: 'Quotations', one: 'quotation', many: 'quotations', icon: 'edit-3' },
  receipt: { label: 'Receipts', one: 'receipt', many: 'receipts', icon: 'download' },
  credit_memo: { label: 'Credit notes', one: 'credit note', many: 'credit notes', icon: 'corner-up-left' },
  bill: { label: 'Bills', one: 'bill', many: 'bills', icon: 'file-minus' },
  purchase_order: { label: 'Purchase orders', one: 'purchase order', many: 'purchase orders', icon: 'shopping-cart' },
  vendor_payment: { label: 'Vendor payments', one: 'vendor payment', many: 'vendor payments', icon: 'upload' },
  vendor_credit: { label: 'Vendor credits', one: 'vendor credit', many: 'vendor credits', icon: 'corner-up-right' },
};

export const countLabel = (n: number, kind: DayDocKind): string =>
  `${n.toLocaleString('en-US')} ${n === 1 ? KIND_META[kind].one : KIND_META[kind].many}`;

/**
 * Where a Day Book row opens: the document's own screen, or — for receipts
 * and vendor payments, which have none — the customer's or vendor's. Null
 * for a deleted document.
 */
export const entryTarget = (e: Pick<DayEntry, 'kind' | 'id' | 'deleted' | 'partyId'>): DayEntryTarget | null => {
  if (e.deleted || !e.id) return null;
  switch (e.kind) {
    case 'invoice':
      return { screen: 'InvoiceDetail', params: { invoiceId: e.id } };
    case 'sales_order':
      return { screen: 'SalesOrderDetail', params: { salesOrderId: e.id } };
    case 'estimate':
      return { screen: 'EstimateDetail', params: { estimateId: e.id } };
    case 'credit_memo':
      return { screen: 'CreditMemoDetail', params: { creditMemoId: e.id } };
    case 'bill':
      return { screen: 'BillDetail', params: { billId: e.id } };
    case 'purchase_order':
      return { screen: 'PODetail', params: { poId: e.id } };
    case 'vendor_credit':
      return { screen: 'VendorCreditDetail', params: { vendorCreditId: e.id } };
    case 'receipt':
      return e.partyId ? { screen: 'CustomerDetail', params: { customerId: e.partyId } } : null;
    case 'vendor_payment':
      return e.partyId ? { screen: 'VendorDetail', params: { vendorId: e.partyId } } : null;
    default:
      return null;
  }
};

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  check: 'Cheque',
  credit_card: 'Card',
  other: 'Other',
};
export const methodLabel = (m: string): string => METHOD_LABELS[m] ?? m.replace(/_/g, ' ');

// ─── Days ───────────────────────────────────────────────────────────────

/** Calendar arithmetic in local time (dayjs) — never `new Date('YYYY-MM-DD')`. */
export const shiftDay = (iso: string, days: number): string => dayjs(iso).add(days, 'day').format('YYYY-MM-DD');

/** "Today", "Yesterday", or the weekday. */
export const relativeDayName = (date: string, today: string): string => {
  if (date === today) return 'Today';
  if (date === shiftDay(today, -1)) return 'Yesterday';
  return dayjs(date).format('dddd');
};

/** "Thu 19 Nov 2026". */
export const dayLabel = (iso: string): string => (iso ? dayjs(iso).format('ddd D MMM YYYY') : '—');

/** "Thu 19 Nov". */
export const dayShortLabel = (iso: string): string => (iso ? dayjs(iso).format('ddd D MMM') : '—');

/**
 * "14:05" — when a document was entered, on the company's clock (not the
 * phone's), so the Day Book matches the hourly chart wherever it is read.
 */
export const entryTime = (iso: string, timeZone?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d);
    } catch {
      // An engine without time-zone data: the phone's clock is the best there is.
    }
  }
  return dayjs(iso).format('HH:mm');
};

/** "Pakistan Standard Time" — the company's zone in words (the IANA name if unknown). */
export const zoneLabel = (timeZone: string): string => {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'long' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName');
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
};

/** Money with a true minus sign (−), so a negative never reads as a hyphen. */
export const dayMoney = (n: number): string => formatCurrency(n).replace(/^-/, '−');

// ─── Comparisons ────────────────────────────────────────────────────────

export const COMPARE_KEYS = ['yesterday', 'lastWeek'] as const;
export type CompareKey = (typeof COMPARE_KEYS)[number];

export const compareLabel = (key: CompareKey): string =>
  key === 'yesterday' ? 'vs day before' : 'vs last week';

export const comparedFigure = (k: DayKpi, key: CompareKey): DayFigure =>
  key === 'yesterday' ? k.previousDay : k.sameDayLastWeek;

/** "+12%" / "−8%", "New" after a day with nothing, null after two empty days. */
export const dayChange = (current: number, previous: number): { text: string; up: boolean } | null => {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { text: 'New', up: true };
  const rounded = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (rounded === 0) return { text: '0%', up: true };
  return { text: `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}%`, up: rounded > 0 };
};

// ─── Needs a look ───────────────────────────────────────────────────────

export interface AttentionItem {
  key: string;
  /** The Day Book filter the line narrows to… */
  filter?: DayEntryFilter;
  /** …or, for overdue purchase orders, the Purchase Orders list. */
  opensPurchaseOrders?: boolean;
  label: string;
  detail: string;
}

export const attentionItems = (s: DaySummary): AttentionItem[] => {
  const a = s.attention;
  const out: AttentionItem[] = [];
  const buying = s.kinds.includes('purchase_order');
  if (a.backdated > 0) {
    out.push({
      key: 'backdated',
      filter: 'backdated',
      label: `${a.backdated} back-dated ${a.backdated === 1 ? 'entry' : 'entries'}`,
      detail: 'Entered on this day but dated earlier.',
    });
  }
  if (a.drafts > 0) {
    out.push({
      key: 'drafts',
      filter: 'drafts',
      label: `${a.drafts} ${a.drafts === 1 ? 'draft' : 'drafts'} not posted`,
      detail: buying ? 'Not in the books, or not sent to the supplier, until posted.' : 'Not in the books until posted.',
    });
  }
  if (a.voided && a.voided.count > 0) {
    out.push({
      key: 'voided',
      filter: 'voided',
      label: `${a.voided.count} voided or deleted (${dayMoney(a.voided.total)})`,
      detail: 'Cancelled on this day, and by whom.',
    });
  }
  if (a.cancelledOrders > 0) {
    const n = a.cancelledOrders;
    out.push({
      key: 'cancelled',
      filter: 'cancelled',
      label: buying
        ? `${n} ${n === 1 ? 'order' : 'orders'} cancelled or withdrawn`
        : `${n} sales ${n === 1 ? 'order' : 'orders'} cancelled`,
      detail: buying
        ? 'Sales orders not to be delivered; purchase orders called off.'
        : 'Dated this day; will not be delivered.',
    });
  }
  const overdue = s.purchasing?.position?.overdue;
  if (overdue && overdue.count > 0) {
    out.push({
      key: 'overdue-pos',
      opensPurchaseOrders: true,
      label: `${overdue.count} purchase ${overdue.count === 1 ? 'order' : 'orders'} overdue`,
      detail: `${dayMoney(overdue.total)} still to arrive${overdue.oldest ? `, expected since ${dayShortLabel(overdue.oldest)}` : ''}.`,
    });
  }
  return out;
};

export const filterLabel = (f: DayEntryFilter): string => {
  switch (f) {
    case 'all':
      return 'All documents';
    case 'backdated':
      return 'Back-dated entries';
    case 'drafts':
      return 'Drafts';
    case 'voided':
      return 'Voided or deleted';
    case 'cancelled':
      return 'Cancelled orders';
    default:
      return KIND_META[f].label;
  }
};

// ─── Sharing ────────────────────────────────────────────────────────────

/** A short summary for WhatsApp (or any chat). *Bold* is WhatsApp's markup. */
export const dayShareText = (s: DaySummary, companyName: string): string => {
  const lines: string[] = [];
  lines.push(`*${companyName || 'Day summary'} — ${dayShortLabel(s.date)}*`);
  if (s.scope.createdBy) lines.push(`Entered by ${s.scope.createdBy.name}`);
  lines.push('');
  if (s.isEmpty) {
    lines.push('Nothing was recorded on this day.');
    return lines.join('\n');
  }
  const h = s.headline;
  // Sales and money received always; the rest only when there was some.
  const line = (label: string, k: DayKpi | null, kind: DayDocKind, always = false) => {
    if (k && (always || k.count > 0 || k.total !== 0)) lines.push(`${label}: ${dayMoney(k.total)} (${countLabel(k.count, kind)})`);
  };
  line('Sales', h.sales, 'invoice', true);
  line('Received', h.received, 'receipt', true);
  line('Orders booked', h.orders, 'sales_order');
  line('POs placed', h.purchaseOrders, 'purchase_order');
  if (h.goodsReceived && h.goodsReceived.count > 0) {
    lines.push(`Goods received: ${dayMoney(h.goodsReceived.total)} at cost (${countLabel(h.goodsReceived.count, 'purchase_order')})`);
  }
  line(h.purchaseOrders ? 'Bills' : 'Purchases', h.purchases, 'bill');
  if (s.sales.returns > 0) lines.push(`Returns: ${dayMoney(s.sales.returns)} · net sales ${dayMoney(s.sales.net)}`);
  if (s.sales.unpaid > 0) lines.push(`Still unpaid from these sales: ${dayMoney(s.sales.unpaid)}`);
  if (s.profit) lines.push(`Gross profit (books): ${dayMoney(s.profit.grossProfit)}`);
  if (s.topCustomers.length > 0) {
    lines.push('', 'Top customers:');
    for (const c of s.topCustomers.slice(0, 3)) lines.push(`• ${c.name} — ${dayMoney(c.total)}`);
  }
  const flags = attentionItems(s);
  if (flags.length > 0) {
    lines.push('');
    for (const f of flags) lines.push(`⚠ ${f.label}`);
  }
  return lines.join('\n');
};

/** The headline figures in screen order: selling, then buying. */
export const headlineRows = (s: DaySummary): Array<[string, DayKpi]> => {
  const h = s.headline;
  const rows: Array<[string, DayKpi | null]> = [
    ['Sales', h.sales],
    ['Money received', h.received],
    ['Orders booked', h.orders],
    ['POs placed', h.purchaseOrders],
    ['Goods received', h.goodsReceived],
    [h.purchaseOrders ? 'Bills' : 'Purchases', h.purchases],
  ];
  return rows.filter((r): r is [string, DayKpi] => r[1] !== null);
};

/**
 * The PDF: headline, documents, money by method, buying, then the Day Book
 * (`entries`, of `entryTotal` in all — the PDF says so when it holds fewer).
 */
export const dayReportDoc = (
  s: DaySummary,
  entries: DayEntry[],
  opts: { compare?: CompareKey; entryTotal?: number; extraRows?: ReportDocRow[] } = {},
): ReportDoc => {
  const rows: ReportDocRow[] = [];
  const compare = opts.compare ?? 'yesterday';
  rows.push({ label: 'Headline', kind: 'heading', values: [null, null] });
  for (const [label, k] of headlineRows(s)) {
    rows.push({ label: `${label} (${compareLabel(compare)}: ${dayMoney(comparedFigure(k, compare).total)})`, values: [String(k.count), k.total] });
  }
  if (s.profit) rows.push({ label: 'Gross profit (books)', values: [null, s.profit.grossProfit] });

  rows.push({ label: 'Documents created', kind: 'heading', values: [null, null] });
  for (const d of s.documents) rows.push({ label: KIND_META[d.kind].label, depth: 1, values: [String(d.count), d.total] });

  if (s.cash.methods.length > 0) {
    rows.push({ label: 'Money in (received)', kind: 'heading', values: [null, null] });
    for (const m of s.cash.methods) {
      if (m.received) rows.push({ label: methodLabel(m.method), depth: 1, values: [null, m.received] });
    }
    rows.push({ label: 'Money out (paid)', kind: 'heading', values: [null, null] });
    for (const m of s.cash.methods) {
      if (m.paid) rows.push({ label: methodLabel(m.method), depth: 1, values: [null, m.paid] });
    }
    rows.push({ label: 'Net', kind: 'total', values: [null, s.cash.net] });
  }

  const p = s.purchasing;
  if (p) {
    rows.push({ label: 'Purchasing', kind: 'heading', values: [null, null] });
    rows.push({ label: 'Purchase orders placed', depth: 1, values: [String(p.placed.count), p.placed.total] });
    rows.push({ label: 'Goods received (at cost)', depth: 1, values: [String(p.received.count), p.received.total] });
    rows.push({ label: 'Billed from purchase orders', depth: 1, values: [String(p.billed.count), p.billed.total] });
    if (p.position) {
      rows.push({ label: 'Open, still to arrive (now)', depth: 1, values: [String(p.position.open.count), p.position.open.total] });
      rows.push({ label: 'Overdue (now)', depth: 1, values: [String(p.position.overdue.count), p.position.overdue.total] });
      rows.push({
        label: 'Received, not yet billed (now)',
        depth: 1,
        values: [String(p.position.receivedNotBilled.count), p.position.receivedNotBilled.total],
      });
    }
  }

  if (opts.extraRows?.length) rows.push(...opts.extraRows);

  const notes = [
    'Documents count on the day they are dated, so these figures agree with the P&L. Drafts, voids, cancelled sales orders and withdrawn purchase orders are listed but not counted.',
    `Times are ${zoneLabel(s.timezone)}.`,
  ];
  if (entries.length > 0) {
    rows.push({ label: 'Day Book', kind: 'heading', values: [null, null] });
    for (const e of entries) {
      const flag = !e.counted ? ` (${e.status ?? 'not counted'})` : e.backdated ? ` (dated ${e.date})` : '';
      const kind = KIND_META[e.kind].one.replace(/^./, c => c.toUpperCase());
      rows.push({
        label: `${entryTime(e.createdAt, s.timezone)} · ${kind} ${e.number ?? ''} · ${e.partyName ?? '—'}${flag}`,
        depth: 1,
        values: [e.createdBy?.name ?? '—', e.amount],
      });
    }
    const all = opts.entryTotal ?? entries.length;
    if (all > entries.length) notes.push(`The Day Book lists the first ${entries.length} of ${all} entries.`);
  }
  return {
    title: s.scope.ownOnly ? 'My day' : 'Day Summary',
    periodLabel: dayjs(s.date).format('dddd, D MMMM YYYY'),
    columns: ['Count / entered by', 'Amount'],
    rows,
    notes,
  };
};

// ─── Digest schedule ────────────────────────────────────────────────────

export const hourLabel = (h: number): string => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
};

/** Evenings send that day; mornings recap the day before. The same choices as the website. */
export const DIGEST_HOURS: Array<{ hour: number; label: string; hint: string }> = [
  ...[17, 18, 19, 20, 21, 22, 23].map(h => ({ hour: h, label: hourLabel(h), hint: 'that day' })),
  ...[6, 7, 8, 9, 10].map(h => ({ hour: h, label: hourLabel(h), hint: 'next morning' })),
];

// ─── Charts ─────────────────────────────────────────────────────────────

/** "Fr" — a week bar's label. */
export const weekdayInitials = (iso: string): string => (iso ? dayjs(iso).format('dd') : '');

/** "9 AM", "12 PM" — an hour axis tick. */
export const hourTick = (h: number): string => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * The hours worth drawing: the working day (8 AM–8 PM) widened to take in any
 * hour that had something in it. Mirrors the website's hourWindow.
 */
export const hourWindow = (hourly: DayHourRow[]): DayHourRow[] => {
  const busy = hourly.filter(h => h.sales > 0 || h.received > 0).map(h => h.hour);
  const from = Math.min(8, ...busy);
  const to = Math.max(20, ...busy);
  return hourly.filter(h => h.hour >= from && h.hour <= to);
};

/** The hour with the most sales and receipts, or null on a quiet day. */
export const busiestHour = (hourly: DayHourRow[]): DayHourRow | null => {
  let best: DayHourRow | null = null;
  for (const h of hourly) {
    const v = h.sales + h.received;
    if (v > 0 && (!best || v > best.sales + best.received)) best = h;
  }
  return best;
};

// ─── Day Book filter chips ─────────────────────────────────────────────

export interface DayBookChip {
  filter: DayEntryFilter;
  label: string;
  count: number | null;
  warn?: boolean;
}

/** Every type with something in it, then the groups that need a look. */
export const dayBookChips = (s: DaySummary, active: DayEntryFilter): DayBookChip[] => {
  const a = s.attention;
  return [
    { filter: 'all', label: 'All', count: null },
    ...s.documents
      .filter(d => d.count > 0 || d.kind === active)
      .map(d => ({ filter: d.kind as DayEntryFilter, label: KIND_META[d.kind].label, count: d.count })),
    ...(a.backdated || active === 'backdated' ? [{ filter: 'backdated' as const, label: 'Back-dated', count: a.backdated, warn: true }] : []),
    ...(a.drafts || active === 'drafts' ? [{ filter: 'drafts' as const, label: 'Drafts', count: a.drafts, warn: true }] : []),
    ...(a.voided && (a.voided.count || active === 'voided')
      ? [{ filter: 'voided' as const, label: 'Voided', count: a.voided.count, warn: true }]
      : []),
    ...(a.cancelledOrders || active === 'cancelled'
      ? [{ filter: 'cancelled' as const, label: 'Cancelled', count: a.cancelledOrders, warn: true }]
      : []),
  ];
};

