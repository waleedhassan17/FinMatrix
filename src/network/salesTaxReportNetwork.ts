import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { bills } from '../dummy-data/bills';
import { round2, withinRange, type ReportDateRange } from '../models/reportModel';
import {
  type SalesTaxReport,
  type SalesTaxReportResponse,
  type SalesTaxRow,
} from '../models/salesTaxReportModel';
import { envelope } from './_reportHelpers';

export const getSalesTaxReportAPI = (
  range: ReportDateRange,
): Promise<SalesTaxReportResponse> => {
  const validInvoices = invoices.filter(
    inv =>
      inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
  );
  const validBills = bills.filter(
    bill => bill.status !== 'draft' && withinRange(bill.issueDate, range),
  );

  const taxMap = new Map<number, SalesTaxRow>();
  const ensureRow = (rate: number): SalesTaxRow => {
    if (!taxMap.has(rate)) {
      taxMap.set(rate, {
        taxRate: rate,
        taxName: rate === 0 ? 'Zero Rated (0%)' : `Standard Tax (${rate}%)`,
        collected: 0,
        paid: 0,
        netLiability: 0,
      });
    }
    return taxMap.get(rate)!;
  };

  validInvoices.forEach(inv => {
    inv.lines.forEach(line => {
      const row = ensureRow(line.taxRate);
      row.collected = round2(row.collected + round2((line.amount * line.taxRate) / 100));
    });
  });

  validBills.forEach(bill => {
    bill.lines.forEach(line => {
      const row = ensureRow(line.taxRate);
      row.paid = round2(row.paid + round2((line.amount * line.taxRate) / 100));
    });
  });

  const rows = Array.from(taxMap.values())
    .map(r => ({ ...r, netLiability: round2(r.collected - r.paid) }))
    .sort((a, b) => b.taxRate - a.taxRate);

  const totalCollected = round2(rows.reduce((s, r) => s + r.collected, 0));
  const totalPaid = round2(rows.reduce((s, r) => s + r.paid, 0));

  return simulateApiCall(
    envelope<SalesTaxReport>({
      range,
      rows,
      totalCollected,
      totalPaid,
      totalNetLiability: round2(totalCollected - totalPaid),
    }),
    300,
  );
};
