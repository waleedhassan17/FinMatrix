// ═══════════════════════════════════════════════════════
// FinMatrix — A financial statement, as a document
// ═══════════════════════════════════════════════════════
// One template for every statement the app exports — balance sheet, trial
// balance, cash flow: the header block (company, report, period, basis,
// generated at), the rows with their section subtotals, and the comparison
// columns when a comparison is on. The PDF may be wide even though the phone
// screen is not, so three or more figure columns turn the page landscape.
//
// Page numbers are laid out here rather than left to CSS: expo-print hands
// the HTML to the platform's WebView printer, and neither iOS nor Android
// fills in `counter(page)`. So the rows are cut into pages of a fixed count,
// each page closes with its own "Page n of N", and a page break follows it.
// The counts are conservative, so a page never overflows into a second sheet
// and pushes its footer onto the wrong page.
//
// Pure — no native modules — so the document is unit-tested; the platform
// hand-off is reportPdf.ts. Colours are the app's own tokens.

import dayjs from 'dayjs';

import { THEME } from '../theme';
import type { CompanyInfo } from './invoicePdf';

const { colors } = THEME;

/** A figure (money, parentheses for negatives), text as given, or blank. */
export type ReportDocValue = number | string | null;

export interface ReportDocRow {
  label: string;
  depth?: number;
  /** 'heading' has no figures; 'subtotal'/'total' rule off; 'grand' doubles it. */
  kind?: 'heading' | 'line' | 'subtotal' | 'total' | 'grand';
  values: ReportDocValue[];
}

export interface ReportDoc {
  /** "Balance Sheet". */
  title: string;
  /** "As of October 26, 2026" / "January 1 – October 26, 2026". */
  periodLabel: string;
  basis?: 'Accrual' | 'Cash';
  /** Figure column headings; one per entry in each row's `values`. */
  columns: string[];
  rows: ReportDocRow[];
  /** Lines under the statement — the tie-out, a warning the server gave. */
  notes?: string[];
}

const esc = (v: string | number | null | undefined): string =>
  v === null || v === undefined
    ? ''
    : String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Grouped, two places, parentheses for a negative — the heading says Rs. */
export const docAmount = (n: number): string => {
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${body})` : body;
};

const cell = (v: ReportDocValue): string =>
  typeof v === 'number' ? docAmount(v) : v === null ? '' : esc(v);

/** Three or more figure columns need the width of a landscape page. */
export const isLandscape = (doc: Pick<ReportDoc, 'columns'>): boolean => doc.columns.length >= 3;

/**
 * Rows per page: the first page also carries the header block. Conservative
 * on purpose — see the note at the top.
 */
export const pageCapacity = (landscape: boolean): { first: number; rest: number } =>
  landscape ? { first: 18, rest: 26 } : { first: 30, rest: 40 };

/**
 * Cut rows into pages. A heading never sits alone at the foot of a page — it
 * moves to the next one, with the rows it heads.
 */
export const paginate = <T extends { kind?: ReportDocRow['kind'] }>(
  rows: T[],
  first: number,
  rest: number,
): T[][] => {
  const pages: T[][] = [];
  let i = 0;
  while (i < rows.length) {
    const cap = pages.length === 0 ? first : rest;
    let end = Math.min(rows.length, i + cap);
    // Pull trailing headings over to the next page, but never empty a page.
    while (end < rows.length && end - 1 > i && rows[end - 1].kind === 'heading') end -= 1;
    pages.push(rows.slice(i, end));
    i = end;
  }
  return pages.length ? pages : [[]];
};

export const reportFilename = (doc: Pick<ReportDoc, 'title' | 'periodLabel'>): string => {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${slug(doc.title)}-${slug(doc.periodLabel)}.pdf`;
};

const rowHtml = (r: ReportDocRow, width: number): string => {
  const kind = r.kind ?? 'line';
  const pad = `padding-left:${6 + (r.depth ?? 0) * 14}px`;
  if (kind === 'heading') {
    return `<tr class="heading"><td style="${pad}" colspan="${width + 1}">${esc(r.label)}</td></tr>`;
  }
  return `<tr class="${kind}"><td style="${pad}">${esc(r.label)}</td>${r.values
    .map(v => `<td class="num">${cell(v)}</td>`)
    .join('')}</tr>`;
};

export function buildReportHtml(doc: ReportDoc, company: CompanyInfo, generatedAt: Date = new Date()): string {
  const landscape = isLandscape(doc);
  const cap = pageCapacity(landscape);
  const pages = paginate(doc.rows, cap.first, cap.rest);
  const stamp = dayjs(generatedAt).format('D MMM YYYY, h:mm A');
  const head = `<thead><tr><th>Account</th>${doc.columns
    .map(c => `<th class="num">${esc(c)}</th>`)
    .join('')}</tr></thead>`;

  const block = `
  <div class="block">
    <div class="co">${esc(company.name)}</div>
    <div class="report">${esc(doc.title)}</div>
    <div class="period">${esc(doc.periodLabel)}</div>
    <div class="meta">${esc(doc.basis ?? 'Accrual')} basis · Amounts in Rs · Generated ${esc(stamp)}</div>
  </div>`;

  const body = pages
    .map((rows, i) => {
      const last = i === pages.length - 1;
      const notes = last && doc.notes?.length
        ? `<div class="notes">${doc.notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>`
        : '';
      return `
  <section class="page${last ? ' last' : ''}">
    ${i === 0 ? block : `<div class="running">${esc(company.name)} · ${esc(doc.title)} · ${esc(doc.periodLabel)}</div>`}
    <table>${head}<tbody>${rows.map(r => rowHtml(r, doc.columns.length)).join('')}</tbody></table>
    ${notes}
    <div class="foot"><span>${esc(company.name)} · Generated with FinMatrix</span><span>Page ${i + 1} of ${pages.length}</span></div>
  </section>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(doc.title)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${colors.textPrimary}; font-size: 10px; line-height: 1.4; margin: 0; background: ${colors.neutral0}; }
  .page { page-break-after: always; break-after: page; }
  .page.last { page-break-after: auto; break-after: auto; }
  .block { text-align: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 2px solid ${colors.primary}; }
  .co { font-size: 14px; font-weight: 700; }
  .report { font-size: 12px; font-weight: 700; color: ${colors.primary}; margin-top: 2px; }
  .period { color: ${colors.textSecondary}; margin-top: 1px; }
  .meta { color: ${colors.textTertiary}; font-size: 8.5px; margin-top: 2px; }
  .running { color: ${colors.textTertiary}; font-size: 8.5px; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px solid ${colors.borderLight}; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${colors.primaryLight}; color: ${colors.primary}; font-size: 8.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 5px 6px; }
  td { padding: 3.5px 6px; border-bottom: 1px solid ${colors.borderLight}; vertical-align: top; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.heading td { font-weight: 700; padding-top: 8px; border-bottom: none; }
  tr.subtotal td, tr.total td { font-weight: 700; border-top: 1px solid ${colors.border}; }
  tr.grand td { font-weight: 800; border-top: 1px solid ${colors.textPrimary}; border-bottom: 3px double ${colors.textPrimary}; }
  .notes { margin-top: 10px; color: ${colors.textSecondary}; }
  .notes p { margin: 2px 0; }
  .foot { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 5px; border-top: 1px solid ${colors.borderLight}; color: ${colors.textTertiary}; font-size: 8px; }
</style></head><body>${body}
</body></html>`;
}
