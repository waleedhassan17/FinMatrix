// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Account Statement (PDF + share)
// ═══════════════════════════════════════════════════════
// Renders the response of GET /customers/:id/statement into a
// professional account-statement PDF and opens the platform
// share-sheet (same production pattern as invoiceShare.ts).
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
 * Maps the raw /statement response (inside the API envelope) to StatementData.
 *
 * Credit memos bring the balance down and a cash refund of one puts it back —
 * the server has sent both since statements stopped leaving them out.
 */
export function statementSerializer(payload: any): StatementData | null {
  const d = payload?.data;
  if (!d?.customer) return null;
  const lines: StatementLine[] = [
    ...list(d.invoices).map((i: any) => ({
      date: i?.invoiceDate ?? '',
      type: 'charge' as const,
      label: 'Invoice',
      reference: i?.invoiceNumber ?? 'Invoice',
      amount: toNumber(i?.total),
    })),
    ...list(d.payments).map((p: any) => ({
      date: p?.paymentDate ?? '',
      type: 'credit' as const,
      label: 'Payment',
      reference: p?.paymentNumber || p?.reference || `Payment ${String(p?.id ?? '').slice(0, 8).toUpperCase()}`,
      amount: toNumber(p?.amount),
    })),
    ...list(d.creditMemos).map((m: any) => ({
      date: m?.date ?? '',
      type: 'credit' as const,
      label: 'Credit memo',
      reference: m?.creditMemoNumber ?? 'Credit memo',
      amount: toNumber(m?.total),
    })),
    ...list(d.refunds).map((r: any) => ({
      date: r?.date ?? '',
      type: 'charge' as const,
      label: 'Refund',
      reference: r?.creditMemoNumber ?? 'Refund',
      amount: toNumber(r?.amount),
    })),
  ].sort(byDate);
  return {
    party: 'customer',
    customerName: d.customer.name ?? '',
    customerEmail: d.customer.email ?? '',
    startDate: d.period?.startDate ?? '',
    endDate: d.period?.endDate ?? '',
    openingBalance: toNumber(d.openingBalance),
    lines,
    totalInvoiced: toNumber(d.totals?.invoiced),
    totalReceived: toNumber(d.totals?.received),
    totalCredited: toNumber(d.totals?.credited),
    totalRefunded: toNumber(d.totals?.refunded),
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
  <div><strong>${esc(data.customerName)}</strong>${data.customerEmail ? `<div class="muted">${esc(data.customerEmail)}</div>` : ''}</div>
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

/**
 * Maps the raw /vendors/:id/statement response to StatementData so it can
 * reuse the same PDF template ("Invoiced" column reads as amounts billed).
 */
export function vendorStatementSerializer(payload: any): StatementData | null {
  const d = payload?.data;
  if (!d?.vendor) return null;
  const lines: StatementLine[] = [
    ...list(d.bills).map((b: any) => ({
      date: b?.billDate ?? '',
      type: 'charge' as const,
      label: 'Bill',
      reference: b?.billNumber ?? 'Bill',
      amount: toNumber(b?.total),
    })),
    ...list(d.payments).map((p: any) => ({
      date: p?.paymentDate ?? '',
      type: 'credit' as const,
      label: 'Payment',
      reference: p?.reference || `Payment ${String(p?.id ?? '').slice(0, 8).toUpperCase()}`,
      amount: toNumber(p?.totalAmount ?? p?.amount),
    })),
    ...list(d.vendorCredits).map((c: any) => ({
      date: c?.date ?? '',
      type: 'credit' as const,
      label: 'Vendor credit',
      reference: c?.vendorCreditNumber ?? 'Vendor credit',
      amount: toNumber(c?.total),
    })),
  ].sort(byDate);
  return {
    party: 'vendor',
    customerName: d.vendor.name ?? '',
    customerEmail: d.vendor.email ?? '',
    startDate: d.period?.startDate ?? '',
    endDate: d.period?.endDate ?? '',
    openingBalance: toNumber(d.openingBalance),
    lines,
    totalInvoiced: toNumber(d.totals?.billed),
    totalReceived: toNumber(d.totals?.paid),
    totalCredited: toNumber(d.totals?.credited),
    totalRefunded: 0,
    closingBalance: toNumber(d.closingBalance),
  };
}

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
