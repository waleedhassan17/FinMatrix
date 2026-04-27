import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { round2, withinRange, type ReportDateRange } from '../models/reportModel';
import {
  type SalesByCustomerReport,
  type SalesByCustomerReportResponse,
  type SalesByCustomerRow,
} from '../models/salesByCustomerModel';
import { envelope } from './_reportHelpers';

export const getSalesByCustomerAPI = (
  range: ReportDateRange,
): Promise<SalesByCustomerReportResponse> => {
  const validInvoices = invoices.filter(
    inv =>
      inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
  );

  const custMap = new Map<string, SalesByCustomerRow>();
  validInvoices.forEach(inv => {
    if (!custMap.has(inv.customerId)) {
      custMap.set(inv.customerId, {
        customerId: inv.customerId,
        customerName: inv.customerName,
        invoiceCount: 0,
        totalSales: 0,
        avgOrder: 0,
      });
    }
    const r = custMap.get(inv.customerId)!;
    r.invoiceCount += 1;
    r.totalSales = round2(r.totalSales + inv.total);
  });

  const rows = Array.from(custMap.values()).map(r => ({
    ...r,
    avgOrder: round2(r.totalSales / r.invoiceCount),
  }));

  return simulateApiCall(
    envelope<SalesByCustomerReport>({
      rows,
      totalSales: round2(rows.reduce((s, r) => s + r.totalSales, 0)),
    }),
    300,
  );
};
