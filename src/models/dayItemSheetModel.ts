// ═══════════════════════════════════════════════════════
// FinMatrix — Item-wise sales (the Day Summary's item sheet)
// ═══════════════════════════════════════════════════════
// The server sends one flat row per item (and per service or charge). Here
// they are grouped, sorted and searched, and the same groups feed the screen,
// the PDF and the shared text. The same rules as the website's
// models/dayItemSheet, so the phone and the web never show different totals.

import dayjs from 'dayjs';
import { formatCurrency, formatQty } from '../utils/formatters';
import type { ReportDoc, ReportDocRow } from '../utils/reportHtml';
import { dayChange } from './daySummaryModel';

export const DAY_ITEM_COMPARES = ['previous', 'lastWeek'] as const;
export type DayItemCompare = (typeof DAY_ITEM_COMPARES)[number];

/**
 * One line of the sheet: a stock item, or a service or charge named by its
 * wording. `net` = sold + free − returned; `value` is net sales (before tax,
 * after the invoice's discount, less returns).
 */
export interface DayItemSheetRow {
  kind: 'item' | 'service';
  itemId: string | null;
  code: string | null;
  name: string;
  unit: string | null;
  category: string | null;
  agency: string | null;
  sold: number;
  free: number;
  returned: number;
  net: number;
  value: number;
  returnsValue: number;
  /** Owner only. */
  cost: number | null;
  profit: number | null;
  margin: number | null;
  costMissing: boolean;
  compareValue: number | null;
}

export interface DayItemCompareOnly {
  kind: 'item' | 'service';
  itemId: string | null;
  name: string;
  category: string | null;
  agency: string | null;
  compareValue: number;
}

export interface DayReorderRow {
  itemId: string;
  code: string;
  name: string;
  unit: string | null;
  onHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  outOfStock: boolean;
}

export interface SheetTotals {
  lines: number;
  sold: number;
  free: number;
  returned: number;
  net: number;
  value: number;
  returnsValue: number;
  cost: number | null;
  profit: number | null;
  margin: number | null;
  compareValue: number | null;
}

export interface DayItemSheet {
  from: string;
  to: string;
  today: string;
  currency: string;
  scope: { ownOnly: boolean; createdBy: { id: string; name: string } | null };
  compare: DayItemCompare | null;
  compareFrom: string | null;
  compareTo: string | null;
  rows: DayItemSheetRow[];
  compareOnly: DayItemCompareOnly[];
  totals: SheetTotals;
  hasFree: boolean;
  showCost: boolean;
  reconciliation: { salesBeforeTax: number; returns: number; netSales: number; matches: boolean };
  /** Null when the plan keeps no stock. */
  reorder: DayReorderRow[] | null;
  generatedAt: string;
}

export const ITEM_GROUPINGS = ['category', 'agency', 'none'] as const;
export type ItemGrouping = (typeof ITEM_GROUPINGS)[number];
export const GROUPING_LABELS: Record<ItemGrouping, string> = { category: 'Category', agency: 'Agency', none: 'None' };

export const ITEM_SORTS = ['code', 'name', 'value', 'net'] as const;
export type ItemSort = (typeof ITEM_SORTS)[number];
export const ITEM_SORT_LABELS: Record<ItemSort, string> = {
  code: 'Code',
  name: 'Name',
  value: 'Net sales',
  net: 'Net units',
};

export const UNCATEGORIZED = 'Uncategorized';
export const NO_AGENCY = 'No agency';
export const SERVICES_GROUP = 'Services & other charges';

/** More lines than this and the sheet opens with its groups folded. */
export const FOLD_AFTER = 30;

export interface SheetGroup {
  key: string;
  label: string;
  services: boolean;
  ungrouped: boolean;
  rows: DayItemSheetRow[];
  totals: SheetTotals;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const marginOf = (profit: number, value: number): number | null =>
  Math.abs(value) < 0.005 ? null : Math.round((profit / value) * 1000) / 10;

const totalsOf = (rows: DayItemSheetRow[], showCost: boolean, compareValue: number | null): SheetTotals => {
  const sum = (pick: (r: DayItemSheetRow) => number) => r2(rows.reduce((t, r) => t + pick(r), 0));
  const value = sum(r => r.value);
  // Gross profit and margin are the stock items': a service or charge carries
  // no cost of goods, so it adds sales but no profit line of its own.
  const itemValue = sum(r => (r.kind === 'item' ? r.value : 0));
  const hasItems = rows.some(r => r.kind === 'item');
  const cost = showCost && hasItems ? sum(r => r.cost ?? 0) : null;
  const profit = cost === null ? null : r2(itemValue - cost);
  return {
    lines: rows.length,
    sold: sum(r => r.sold),
    free: sum(r => r.free),
    returned: sum(r => r.returned),
    net: sum(r => r.net),
    value,
    returnsValue: sum(r => r.returnsValue),
    cost,
    profit,
    margin: profit === null ? null : marginOf(profit, itemValue),
    compareValue,
  };
};

const groupOf = (
  row: { kind: 'item' | 'service'; category: string | null; agency: string | null },
  by: ItemGrouping,
): { key: string; label: string; services: boolean; ungrouped: boolean } => {
  if (row.kind === 'service') return { key: 'services', label: SERVICES_GROUP, services: true, ungrouped: false };
  if (by === 'none') return { key: 'all', label: 'Items', services: false, ungrouped: false };
  const raw = (by === 'category' ? row.category : row.agency)?.trim() ?? '';
  if (!raw) {
    return { key: 'none', label: by === 'category' ? UNCATEGORIZED : NO_AGENCY, services: false, ungrouped: true };
  }
  // "Nestle Powder" and "NESTLE  POWDER" are one group: spelling is free text.
  return { key: `g:${raw.toLowerCase().replace(/\s+/g, ' ')}`, label: raw, services: false, ungrouped: false };
};

const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const byCode = (a: DayItemSheetRow, b: DayItemSheetRow) => {
  if (a.code && b.code) return naturalCompare(a.code, b.code) || naturalCompare(a.name, b.name);
  if (a.code) return -1;
  if (b.code) return 1;
  return naturalCompare(a.name, b.name);
};

const ROW_ORDER: Record<ItemSort, (a: DayItemSheetRow, b: DayItemSheetRow) => number> = {
  code: byCode,
  name: (a, b) => naturalCompare(a.name, b.name) || byCode(a, b),
  value: (a, b) => b.value - a.value || byCode(a, b),
  net: (a, b) => b.net - a.net || b.value - a.value || byCode(a, b),
};

const matches = (q: string, row: { name: string; code?: string | null }) =>
  !q || row.name.toLowerCase().includes(q) || (row.code ?? '').toLowerCase().includes(q);

/**
 * The sheet as groups: each with its rows (sorted) and subtotal, items before
 * services, the ungrouped bucket last among the items. A search keeps only the
 * matching lines, and the totals follow what is shown.
 */
export function groupItemSheet(
  sheet: DayItemSheet,
  opts: { groupBy: ItemGrouping; sort: ItemSort; q?: string },
): { groups: SheetGroup[]; totals: SheetTotals; filtered: boolean } {
  const q = (opts.q ?? '').trim().toLowerCase();
  const rows = sheet.rows.filter(r => matches(q, r));
  const comparing = sheet.compare !== null;

  const groups = new Map<string, SheetGroup & { before: number }>();
  for (const r of rows) {
    const g0 = groupOf(r, opts.groupBy);
    let g = groups.get(g0.key);
    if (!g) {
      g = { ...g0, rows: [], totals: totalsOf([], sheet.showCost, null), before: 0 };
      groups.set(g0.key, g);
    }
    g.rows.push(r);
    g.before += r.compareValue ?? 0;
  }
  if (comparing) {
    for (const c of sheet.compareOnly) {
      if (!matches(q, c)) continue;
      const g = groups.get(groupOf(c, opts.groupBy).key);
      if (g) g.before += c.compareValue;
    }
  }

  const ordered: SheetGroup[] = [...groups.values()].map(g => ({
    key: g.key,
    label: g.label,
    services: g.services,
    ungrouped: g.ungrouped,
    rows: [...g.rows].sort(ROW_ORDER[opts.sort]),
    totals: totalsOf(g.rows, sheet.showCost, comparing ? r2(g.before) : null),
  }));
  const bySize = opts.sort === 'value' || opts.sort === 'net';
  ordered.sort(
    (a, b) =>
      Number(a.services) - Number(b.services) ||
      Number(a.ungrouped) - Number(b.ungrouped) ||
      (bySize ? (opts.sort === 'net' ? b.totals.net - a.totals.net : b.totals.value - a.totals.value) : 0) ||
      naturalCompare(a.label, b.label),
  );

  const filtered = q !== '';
  const compareTotal = comparing
    ? filtered
      ? r2(ordered.reduce((t, g) => t + (g.totals.compareValue ?? 0), 0))
      : sheet.totals.compareValue
    : null;
  return { groups: ordered, totals: totalsOf(rows, sheet.showCost, compareTotal), filtered };
}

/** "Mon 23 Nov 2026", or "25 Oct – 26 Oct 2026" for a range. */
export const sheetPeriodLabel = (from: string, to: string): string => {
  if (!from) return '—';
  if (!to || from === to) return dayjs(from).format('ddd D MMM YYYY');
  const a = dayjs(from);
  const b = dayjs(to);
  return a.year() === b.year()
    ? `${a.format('D MMM')} – ${b.format('D MMM YYYY')}`
    : `${a.format('D MMM YYYY')} – ${b.format('D MMM YYYY')}`;
};

/** "+12%", "−8%", "New" or null — the change against the comparison period. */
export const sheetChange = (current: number, previous: number | null) =>
  previous === null ? null : dayChange(current, previous);

/** Quantities print without needless decimals; 0 prints as a dash. */
export const qtyCell = (n: number): string => (Math.abs(n) < 0.00005 ? '–' : formatQty(n));

export const marginText = (m: number | null): string => (m === null ? '–' : `${m.toFixed(1)}%`);

/** Share of item lines with no category, to suggest setting categories. */
export const uncategorizedShare = (sheet: DayItemSheet): number => {
  const items = sheet.rows.filter(r => r.kind === 'item');
  if (items.length === 0) return 0;
  return items.filter(r => !r.category?.trim()).length / items.length;
};

/** Lines for a shared summary: the top three groups by net sales. */
export const itemShareLines = (sheet: DayItemSheet, groupBy: ItemGrouping = 'category'): string[] => {
  const { groups } = groupItemSheet(sheet, { groupBy, sort: 'value' });
  const top = groups.filter(g => !g.services && g.totals.value > 0).slice(0, 3);
  if (top.length === 0) return [];
  return [
    'Top product groups:',
    ...top.map(g => `• ${g.label} — ${formatCurrency(g.totals.value)} (${formatQty(g.totals.net)} units)`),
  ];
};

/**
 * The sheet as a PDF, laid out like a distributor's sales summary: a heading
 * per group, a line per item (its code first), the group's total, and the
 * grand total.
 */
export const itemSheetDoc = (
  sheet: DayItemSheet,
  view: { groupBy: ItemGrouping; sort: ItemSort; q?: string },
  companyName?: string,
): ReportDoc => {
  const { groups, totals } = groupItemSheet(sheet, view);
  const figures = (t: Pick<SheetTotals, 'sold' | 'free' | 'returned' | 'net' | 'value' | 'profit' | 'margin'>) => [
    qtyCell(t.sold),
    ...(sheet.hasFree ? [qtyCell(t.free)] : []),
    qtyCell(t.returned),
    qtyCell(t.net),
    t.value,
    ...(sheet.showCost ? [t.profit, marginText(t.margin)] : []),
  ];
  const rows: ReportDocRow[] = [];
  const blank: null[] = figures(totals).map((): null => null);
  for (const g of groups) {
    rows.push({ label: g.label, kind: 'heading', values: blank });
    for (const r of g.rows) {
      rows.push({ label: r.code ? `${r.code}  ${r.name}` : r.name, depth: 1, values: figures(r) });
    }
    rows.push({ label: `Total ${g.label}`, kind: 'subtotal', values: figures(g.totals) });
  }
  rows.push({ label: 'Grand total', kind: 'grand', values: figures(totals) });
  const tie = sheet.reconciliation;
  return {
    title: companyName ? `${companyName} — Item-wise sales` : 'Item-wise sales',
    periodLabel: sheetPeriodLabel(sheet.from, sheet.to),
    columns: [
      'Sold',
      ...(sheet.hasFree ? ['Free'] : []),
      'Returned',
      'Net units',
      'Net sales',
      ...(sheet.showCost ? ['Gross profit', 'Margin'] : []),
    ],
    rows,
    notes: [
      `Net sales ${formatCurrency(tie.netSales)} = invoices before tax, after discounts ${formatCurrency(
        tie.salesBeforeTax,
      )} − returns ${formatCurrency(tie.returns)}.`,
      'Net units = sold + free − returned. Free units were given at price 0. Net sales are before tax, after each invoice’s discount, less returns.',
    ],
  };
};
