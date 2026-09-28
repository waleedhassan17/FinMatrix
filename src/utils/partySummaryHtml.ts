// ═══════════════════════════════════════════════════════
// FinMatrix — Outstanding-invoices / payables summary, as a document
// ═══════════════════════════════════════════════════════
// The HTML that expo-print turns into the PDF: the same document the website
// produces — letterhead, who it is for, every unpaid invoice or bill and how
// late, the credits that come off, the figure to ask for, and the aging.
//
// Pure — no native modules — so the document itself is unit-tested; the
// platform hand-offs live in partySummaryPdf.ts. Colours are the app's own
// tokens, so the document and the screen it came from are one brand.

import { THEME } from '../theme';
import { PAYMENT_TERMS_LABELS, paymentTermsFromApi } from '../models/customerModel';
import {
  CREDIT_KIND_LABELS,
  SUMMARY_COPY,
  countLabel,
  headlineFigure,
  lateness,
  rs,
  summaryDate,
  type PartySummary,
} from '../models/partySummaryModel';
import type { CompanyInfo } from './invoicePdf';

const { colors } = THEME;

const esc = (v: string | number | null | undefined): string =>
  v === null || v === undefined
    ? ''
    : String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** A figure in a table: grouped, two places, no currency — the header says Rs. */
const amt = (n: number): string =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Zero as a dash: "nothing paid" is the usual case, and a column of 0.00 is noise. */
const amtOrDash = (n: number): string => (n === 0 ? '—' : amt(n));

const termsLabel = (apiTerms: string): string =>
  apiTerms ? PAYMENT_TERMS_LABELS[paymentTermsFromApi(apiTerms)] ?? '' : '';

export function buildPartySummaryHtml(
  s: PartySummary,
  company: CompanyInfo,
  generatedAt: Date = new Date(),
): string {
  const copy = SUMMARY_COPY[s.partyType];
  const head = headlineFigure(s);
  const asOf = summaryDate(s.asOfDate);
  const terms = termsLabel(s.party.paymentTerms);
  const hasCredits = s.credits.items.length > 0;
  const paidTotal = s.documents.reduce((t, d) => t + d.amountPaid, 0);
  const grandTotal = s.documents.reduce((t, d) => t + d.total, 0);

  const companyLines = [
    [company.addressLine1, company.addressLine2].filter(Boolean).join(', '),
    [company.phone, company.email].filter(Boolean).join(' · '),
    company.taxId ? `NTN ${company.taxId}` : '',
  ].filter(Boolean);

  const partyLines = [
    s.party.contactPerson ? `Attn: ${s.party.contactPerson}` : '',
    s.party.address,
    [s.party.phone, s.party.email].filter(Boolean).join(' · '),
    s.party.taxId ? `NTN ${s.party.taxId}` : '',
  ].filter(Boolean);

  const meta: [string, string][] = [
    ['As of', asOf],
    ...(terms ? ([['Payment terms', terms]] as [string, string][]) : []),
    [head.label, rs(head.value)],
    ...(s.totals.overdue > 0
      ? ([[`Overdue (${countLabel(s.totals.overdueCount, s.partyType)})`, rs(s.totals.overdue)]] as [string, string][])
      : []),
    ...(s.lastPayment
      ? ([[copy.lastPaymentLabel, `${rs(s.lastPayment.amount)} · ${summaryDate(s.lastPayment.date)}`]] as [string, string][])
      : []),
  ];

  const documentRows =
    s.documents.length === 0
      ? `<tr><td colspan="7" class="muted">No unpaid ${esc(copy.nounPlural)}</td></tr>`
      : s.documents
          .map(
            d => `
        <tr>
          <td class="ref">${esc(d.documentNumber || '—')}</td>
          <td>${esc(summaryDate(d.issueDate))}</td>
          <td>${esc(summaryDate(d.dueDate))}</td>
          <td>${esc(lateness(d.daysOverdue))}</td>
          <td class="num">${amt(d.total)}</td>
          <td class="num">${amtOrDash(d.amountPaid)}</td>
          <td class="num">${amt(d.balance)}</td>
        </tr>`,
          )
          .join('') +
        `
        <tr class="total">
          <td>Total</td><td></td><td></td>
          <td>${esc(countLabel(s.documents.length, s.partyType))}</td>
          <td class="num">${amt(grandTotal)}</td>
          <td class="num">${amtOrDash(paidTotal)}</td>
          <td class="num">${amt(s.totals.outstanding)}</td>
        </tr>`;

  const creditsTable = hasCredits
    ? `
    <h2>Unapplied credits</h2>
    <table class="grid">
      <thead><tr><th style="width:26%">Reference</th><th style="width:15%">Date</th><th>Type</th><th class="num" style="width:15%">Amount</th><th class="num" style="width:15%">Available</th></tr></thead>
      <tbody>
        ${s.credits.items
          .map(
            c => `
        <tr>
          <td class="ref">${esc(c.reference || '—')}</td>
          <td>${esc(summaryDate(c.date))}</td>
          <td>${esc(CREDIT_KIND_LABELS[c.kind])}</td>
          <td class="num">${amt(c.amount)}</td>
          <td class="num">${amt(c.available)}</td>
        </tr>`,
          )
          .join('')}
        <tr class="total"><td>Total</td><td></td><td></td><td></td><td class="num">${amt(s.credits.total)}</td></tr>
      </tbody>
    </table>`
    : '';

  const totalsBlock = hasCredits
    ? `
    <div class="totals">
      <div class="row"><span>Total outstanding</span><span>${esc(rs(s.totals.outstanding))}</span></div>
      <div class="row"><span>Less credits</span><span>− ${esc(rs(s.credits.total))}</span></div>
      <div class="row grand"><span>${esc(head.label)}</span><span>${esc(rs(head.value))}</span></div>
    </div>`
    : `
    <div class="totals">
      <div class="row grand"><span>${esc(head.label)}</span><span>${esc(rs(head.value))}</span></div>
    </div>`;

  const agingTable =
    s.documents.length > 0 && s.buckets.length > 0
      ? `
    <h2>Aging · days overdue</h2>
    <table class="grid aging">
      <thead><tr>${s.buckets.map(b => `<th class="num">${esc(b.label)}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody><tr class="strong">${s.buckets
        .map(b => `<td class="num">${amtOrDash(b.amount)}</td>`)
        .join('')}<td class="num">${amt(s.totals.outstanding)}</td></tr></tbody>
    </table>`
      : '';

  const note =
    s.partyType === 'customer'
      ? `Balances as of ${asOf}. A payment made after that date may not be shown yet — if anything here differs from your records, please let us know.`
      : `Balances as recorded in our books on ${asOf}. If anything here differs from your records, please let us know.`;

  const stamp = generatedAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(copy.title)} — ${esc(s.party.name)}</title>
<style>
  @page { size: A4; margin: 14mm 13mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${colors.textPrimary}; font-size: 10.5px; line-height: 1.45; margin: 0; background: ${colors.neutral0}; }
  .bar { height: 4px; background: ${colors.primary}; margin-bottom: 16px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid ${colors.border}; margin-bottom: 16px; }
  .co { display: flex; gap: 10px; align-items: flex-start; }
  .mark { width: 34px; height: 34px; border-radius: 6px; background: ${colors.primary}; color: ${colors.neutral0}; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .co-name { font-size: 15px; font-weight: 700; }
  .co-line { color: ${colors.textSecondary}; font-size: 9.5px; margin-top: 1px; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 19px; font-weight: 800; color: ${colors.primary}; letter-spacing: .08em; text-transform: uppercase; }
  .title .sub { color: ${colors.textSecondary}; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
  .overline, h2 { font-size: 8.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: ${colors.textTertiary}; }
  h2 { margin: 16px 0 6px; }
  .party-name { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .muted { color: ${colors.textSecondary}; }
  .meta { border: 1px solid ${colors.borderLight}; border-radius: 4px; padding: 6px 10px; min-width: 215px; border-collapse: separate; }
  .meta td { padding: 1.5px 0; color: ${colors.textSecondary}; }
  .meta td.v { text-align: right; font-weight: 600; color: ${colors.textPrimary}; padding-left: 18px; white-space: nowrap; }
  table.grid { width: 100%; border-collapse: collapse; }
  table.grid thead { display: table-header-group; }
  table.grid th { background: ${colors.primaryLight}; color: ${colors.primary}; font-size: 8.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; text-align: left; padding: 6px; }
  table.grid td { padding: 5px 6px; border-bottom: 1px solid ${colors.borderLight}; vertical-align: top; }
  table.grid tr { page-break-inside: avoid; break-inside: avoid; }
  table.grid tbody tr:nth-child(even) td { background: ${colors.neutral50}; }
  .num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ref { word-break: break-all; }
  tr.total td, tr.strong td { font-weight: 700; }
  tr.total td { border-top: 1px solid ${colors.border}; border-bottom: none; background: ${colors.neutral0} !important; }
  .totals { width: 250px; margin: 10px 0 4px auto; page-break-inside: avoid; }
  .totals .row { display: flex; justify-content: space-between; padding: 2px 0; color: ${colors.textSecondary}; }
  .totals .row span:last-child { color: ${colors.textPrimary}; font-weight: 600; }
  .totals .grand { background: ${colors.primaryLight}; color: ${colors.textPrimary}; font-weight: 800; font-size: 12.5px; padding: 6px 8px; border-radius: 3px; margin-top: 4px; }
  .note { margin-top: 16px; page-break-inside: avoid; }
  .note p { margin: 3px 0 0; color: ${colors.textSecondary}; }
  .foot { margin-top: 22px; padding-top: 6px; border-top: 1px solid ${colors.borderLight}; color: ${colors.textTertiary}; font-size: 8.5px; }
</style></head><body>
  <div class="bar"></div>
  <div class="head">
    <div class="co">
      <div class="mark">${esc(initials(company.name))}</div>
      <div>
        <div class="co-name">${esc(company.name)}</div>
        ${companyLines.map(l => `<div class="co-line">${esc(l)}</div>`).join('')}
      </div>
    </div>
    <div class="title">
      <h1>${esc(copy.title)}</h1>
      <div class="sub">As of ${esc(asOf)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="overline">${esc(copy.partyLabel)}</div>
      <div class="party-name">${esc(s.party.name)}</div>
      ${partyLines.map(l => `<div class="muted">${esc(l)}</div>`).join('')}
    </div>
    <table class="meta">
      ${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}
    </table>
  </div>

  <h2>${esc(copy.documentsTitle)}</h2>
  <table class="grid">
    <thead><tr>
      <th style="width:22%">${esc(copy.numberHeader)}</th><th style="width:12%">Date</th><th style="width:12%">Due</th><th>Status</th>
      <th class="num" style="width:12%">Amount</th><th class="num" style="width:10%">Paid</th><th class="num" style="width:13%">Balance</th>
    </tr></thead>
    <tbody>${documentRows}</tbody>
  </table>
  ${hasCredits ? '' : totalsBlock}
  ${creditsTable}
  ${hasCredits ? totalsBlock : ''}
  ${agingTable}

  <div class="note">
    <div class="overline">Note</div>
    <p>${esc(note)}</p>
  </div>
  <div class="foot">${esc(company.name)} · Generated with FinMatrix · ${esc(stamp)}</div>
</body></html>`;
}

/** "WC" for Warehouse Co — the letterhead's mark when there is no logo. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}
