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
  documents: number;
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
  };
  trendDates: string[];
  documents: DayDocumentRow[];
  sales: { subtotal: number; discount: number; tax: number; total: number; unpaid: number };
  cash: { methods: DayMethodRow[]; received: number; paid: number; net: number };
  topCustomers: DayPartyRow[];
  topItems: DayItemRow[];
  /** 24 rows: the day's sales and receipts by the hour they were entered. */
  hourly: DayHourRow[];
  team: DayUserRow[] | null;
  members: DayMember[] | null;
  profit: { revenue: number; cogs: number; grossProfit: number; expenses: number; netIncome: number } | null;
  attention: { backdated: number; drafts: number; cancelledOrders: number; voided: DayFigure | null };
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
  items: DayEntry[];
  total: number;
  page: number;
  limit: number;
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

export const entryTime = (iso: string): string => (iso ? dayjs(iso).format('HH:mm') : '—');

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
  filter: DayEntryFilter;
  label: string;
  detail: string;
}

export const attentionItems = (s: DaySummary): AttentionItem[] => {
  const a = s.attention;
  const out: AttentionItem[] = [];
  if (a.backdated > 0) {
    out.push({
      filter: 'backdated',
      label: `${a.backdated} back-dated ${a.backdated === 1 ? 'entry' : 'entries'}`,
      detail: 'Entered on this day but dated earlier.',
    });
  }
  if (a.drafts > 0) {
    out.push({
      filter: 'drafts',
      label: `${a.drafts} ${a.drafts === 1 ? 'draft' : 'drafts'} not posted`,
      detail: 'Not in the books until posted.',
    });
  }
  if (a.voided && a.voided.count > 0) {
    out.push({
      filter: 'voided',
      label: `${a.voided.count} voided or deleted (${formatCurrency(a.voided.total)})`,
      detail: 'Cancelled on this day, and by whom.',
    });
  }
  if (a.cancelledOrders > 0) {
    out.push({
      filter: 'cancelled',
      label: `${a.cancelledOrders} sales ${a.cancelledOrders === 1 ? 'order' : 'orders'} cancelled`,
      detail: 'Dated this day; will not be delivered.',
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
  lines.push(`Sales: ${formatCurrency(h.sales.total)} (${countLabel(h.sales.count, 'invoice')})`);
  lines.push(`Received: ${formatCurrency(h.received.total)} (${countLabel(h.received.count, 'receipt')})`);
  if (h.orders) lines.push(`Orders booked: ${formatCurrency(h.orders.total)} (${countLabel(h.orders.count, 'sales_order')})`);
  lines.push(`Purchases: ${formatCurrency(h.purchases.total)} (${countLabel(h.purchases.count, 'bill')})`);
  if (s.sales.unpaid > 0) lines.push(`Still unpaid from these sales: ${formatCurrency(s.sales.unpaid)}`);
  if (s.profit) lines.push(`Gross profit: ${formatCurrency(s.profit.grossProfit)}`);
  if (s.topCustomers.length > 0) {
    lines.push('', 'Top customers:');
    for (const c of s.topCustomers.slice(0, 3)) lines.push(`• ${c.name} — ${formatCurrency(c.total)}`);
  }
  const flags = attentionItems(s);
  if (flags.length > 0) {
    lines.push('');
    for (const f of flags) lines.push(`⚠ ${f.label}`);
  }
  return lines.join('\n');
};

/** The PDF: headline, documents, money by method, then the Day Book. */
export const dayReportDoc = (s: DaySummary, entries: DayEntry[]): ReportDoc => {
  const rows: ReportDocRow[] = [];
  const h = s.headline;
  rows.push({ label: 'Headline', kind: 'heading', values: [null, null] });
  rows.push({ label: 'Sales', values: [String(h.sales.count), h.sales.total] });
  rows.push({ label: 'Money received', values: [String(h.received.count), h.received.total] });
  if (h.orders) rows.push({ label: 'Orders booked', values: [String(h.orders.count), h.orders.total] });
  rows.push({ label: 'Purchases', values: [String(h.purchases.count), h.purchases.total] });
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

  if (entries.length > 0) {
    rows.push({ label: 'Day Book', kind: 'heading', values: [null, null] });
    for (const e of entries) {
      const flag = !e.counted ? ` (${e.status ?? 'not counted'})` : e.backdated ? ` (dated ${e.date})` : '';
      rows.push({
        label: `${entryTime(e.createdAt)} · ${KIND_META[e.kind].label} ${e.number ?? ''} · ${e.partyName ?? '—'}${flag}`,
        depth: 1,
        values: [e.createdBy?.name ?? '—', e.amount],
      });
    }
  }
  return {
    title: s.scope.ownOnly ? 'My day' : 'Day Summary',
    periodLabel: dayjs(s.date).format('dddd, D MMMM YYYY'),
    columns: ['Count / by', 'Amount'],
    rows,
    notes: [
      'Documents count on the day they are dated, so these figures agree with the P&L. Drafts, voids and cancelled orders are listed but not counted.',
    ],
  };
};

// ─── Digest schedule ────────────────────────────────────────────────────

export const hourLabel = (h: number): string => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
};

/** Evenings send that day; mornings recap the day before. */
export const DIGEST_HOURS: Array<{ hour: number; label: string; hint: string }> = [
  ...[18, 19, 20, 21, 22, 23].map(h => ({ hour: h, label: hourLabel(h), hint: 'that day' })),
  ...[7, 8, 9].map(h => ({ hour: h, label: hourLabel(h), hint: 'next morning' })),
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

