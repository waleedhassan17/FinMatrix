// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Account Statement (PDF + share)
// ═══════════════════════════════════════════════════════
// Renders the response of GET /customers/:id/ledger-statement (and the
// vendor twin) into a professional account-statement PDF and opens the
// platform share-sheet (same production pattern as invoiceShare.ts).
//
// Platform note: expo-print's printToFileAsync has no web
// implementation, so on web we open the browser print dialog
// instead (user can "Save as PDF" from there).

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { formatCurrency, formatDate } from './formatters';
import { DEFAULT_COMPANY, type CompanyInfo } from './invoicePdf';

// ─── Statement data (serialized from the API) ────────

export interface StatementLine {
  date: string;
  /** A charge raises what is owed (invoice, bill, refund); a credit lowers it. */
  type: 'charge' | 'credit';
  /** "Invoice", "Payment", "Credit memo", "Refund", "Bill", "Vendor credit". */
  label: string;
  reference: string;
  /** Always positive; `type` says which way it moves the balance. */
  amount: number;
}

export interface StatementData {
  /** Whose statement — sets the words in the totals. */
  party: 'customer' | 'vendor';
  customerName: string;
  customerEmail: string;
  /** The party's ID (C-0007 / V-0003), printed under the name; empty when it has none. */
  partyCode?: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  lines: StatementLine[];
  /** Invoiced (customer) or billed (vendor) in the period. */
  totalInvoiced: number;
  /** Received from the customer, or paid to the vendor. */
  totalReceived: number;
  /** Credit memos or vendor credits in the period; 0 from an older server. */
  totalCredited: number;
  /** Cash refunds of credit memos; 0 from an older server. */
  totalRefunded: number;
  closingBalance: number;
}

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const byDate = (a: StatementLine, b: StatementLine) => a.date.localeCompare(b.date);
const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/**
 * Maps the `…/ledger-statement` response (inside the API envelope) to
 * StatementData.
 *
 * The server reads the statement from the books — the same postings as the
 * party's view in the General Ledger — and sends one signed line per
 * transaction in date order, ready to print: an invoice, bill or refund raises
 * the balance, a receipt, payment or credit lowers it. Customer and vendor
 * statements share the shape; only the totals' names differ. (The old
 * `/statement` sent document arrays to merge here, and missed what was posted
 * without a document, such as a legacy prepaid delivery's advance.)
 */
export function statementSerializer(payload: any): StatementData | null {
  const d = payload?.data ?? payload;
  if (!d?.party || !Array.isArray(d?.lines)) return null;
  const vendor = d.partyType === 'vendor';
  const lines: StatementLine[] = list(d.lines).map((l: any) => {
    const amount = toNumber(l?.amount);
    return {
      date: l?.date ?? '',
      type: amount >= 0 ? ('charge' as const) : ('credit' as const),
      label: l?.label || 'Posting',
      reference: l?.reference || '—',
      amount: Math.abs(amount),
    };
  });
  return {
    party: vendor ? 'vendor' : 'customer',
    customerName: d.party.name ?? '',
    customerEmail: d.party.email ?? '',
    partyCode: d.party.code ?? '',
    startDate: d.period?.startDate ?? '',
    endDate: d.period?.endDate ?? '',
    openingBalance: toNumber(d.openingBalance),
    lines,
    totalInvoiced: toNumber(vendor ? d.totals?.billed : d.totals?.invoiced),
    totalReceived: toNumber(vendor ? d.totals?.paid : d.totals?.received),
    totalCredited: toNumber(d.totals?.credited),
    totalRefunded: vendor ? 0 : toNumber(d.totals?.refunded),
    closingBalance: toNumber(d.closingBalance),
  };
}

// ─── HTML rendering ──────────────────────────────────

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildStatementHtml(data: StatementData, company: CompanyInfo = DEFAULT_COMPANY): string {
  let running = data.openingBalance;
  const rows = data.lines
    .map(line => {
      running += line.type === 'charge' ? line.amount : -line.amount;
      return `
        <tr>
          <td>${esc(formatDate(line.date))}</td>
          <td>${esc(line.label)}</td>
          <td>${esc(line.reference)}</td>
          <td class="num">${line.type === 'charge' ? esc(formatCurrency(line.amount, 'Rs ')) : ''}</td>
          <td class="num">${line.type === 'credit' ? esc(formatCurrency(line.amount, 'Rs ')) : ''}</td>
          <td class="num">${esc(formatCurrency(running, 'Rs '))}</td>
        </tr>`;
    })
    .join('');
  const vendor = data.party === 'vendor';
  const summaryRow = (label: string, value: number) =>
    `<tr><td>${esc(label)}</td><td class="num">${esc(formatCurrency(value, 'Rs '))}</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #0F172A; margin: 32px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0; color: #065F46; }
  .muted { color: #64748B; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748B; border-bottom: 2px solid #E2E8F0; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #F1F5F9; }
  .num { text-align: right; white-space: nowrap; }
  .summary { margin-top: 20px; margin-left: auto; width: 300px; }
  .summary td { border: none; padding: 4px 6px; }
  .summary .total td { border-top: 2px solid #0F172A; font-weight: 700; }
</style></head><body>
  <div class="head">
    <div>
      <h1>${esc(company.name)}</h1>
      <div class="muted">${esc([company.addressLine1, company.addressLine2].filter(Boolean).join(', '))}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:16px;font-weight:700">ACCOUNT STATEMENT</div>
      <div class="muted">${esc(formatDate(data.startDate))} — ${esc(formatDate(data.endDate))}</div>
    </div>
  </div>
  <div><strong>${esc(data.customerName)}</strong>${data.partyCode ? `<div class="muted">${data.party === 'vendor' ? 'Vendor' : 'Customer'} ID ${esc(data.partyCode)}</div>` : ''}${data.customerEmail ? `<div class="muted">${esc(data.customerEmail)}</div>` : ''}</div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="num">${vendor ? 'Billed' : 'Invoiced'}</th><th class="num">Paid &amp; credited</th><th class="num">Balance</th></tr></thead>
    <tbody>
      <tr><td>${esc(formatDate(data.startDate))}</td><td colspan="4">Opening balance</td><td class="num">${esc(formatCurrency(data.openingBalance, 'Rs '))}</td></tr>
      ${rows || '<tr><td colspan="6" class="muted">No activity in this period.</td></tr>'}
    </tbody>
  </table>
  <table class="summary">
    ${summaryRow('Opening balance', data.openingBalance)}
    ${summaryRow(vendor ? 'Billed this period' : 'Invoiced this period', data.totalInvoiced)}
    ${summaryRow(vendor ? 'Payments made' : 'Payments received', data.totalReceived)}
    ${data.totalCredited ? summaryRow(vendor ? 'Vendor credits' : 'Credit memos', data.totalCredited) : ''}
    ${data.totalRefunded ? summaryRow('Refunds paid', data.totalRefunded) : ''}
    <tr class="total"><td>Closing balance</td><td class="num">${esc(formatCurrency(data.closingBalance, 'Rs '))}</td></tr>
  </table>
</body></html>`;
}

/** The vendor statement reads the same shape as the customer's. */
export const vendorStatementSerializer = statementSerializer;

/** Vendor variant of shareStatementPdf — takes the raw API payload. */
export async function shareVendorStatementPdf(
  payload: any,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<{ shared: boolean; reason?: string }> {
  const data = vendorStatementSerializer(payload);
  if (!data) return { shared: false, reason: 'Could not load the statement.' };
  return shareStatementPdf(data, company);
}

// ─── Generate + share ────────────────────────────────

export async function shareStatementPdf(
  data: StatementData,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<{ shared: boolean; reason?: string }> {
  const html = buildStatementHtml(data, company);

  if (Platform.OS === 'web') {
    // No printToFileAsync on web — the browser print dialog lets the
    // user save the statement as a PDF instead.
    await Print.printAsync({ html });
    return { shared: true };
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return { shared: false, reason: 'Sharing is not available on this device.' };
  }

  const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });
  const filename = `Statement_${data.customerName.replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 40) || 'Customer'}.pdf`;
  let uri = tmpUri;
  try {
    const tmpFile = new File(tmpUri);
    const destFile = new File(Paths.cache, filename);
    if (destFile.exists) {
      try { destFile.delete(); } catch { /* noop */ }
    }
    tmpFile.move(destFile);
    uri = destFile.uri;
  } catch { /* fall back to the temp URI */ }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Share statement — ${data.customerName}`,
    });
    return { shared: true };
  } catch (err: any) {
    return { shared: false, reason: err?.message || 'Share cancelled.' };
  }
}
