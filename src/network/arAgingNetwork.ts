import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { round2 } from '../models/reportModel';
import {
  type ARAgingReport,
  type ARAgingReportResponse,
  type ARAgingRow,
} from '../models/arAgingModel';
import { bucketAmount, envelope } from './_reportHelpers';

export const getARAgingReportAPI = async (
  asOfDate: string,
): Promise<ARAgingReportResponse> => {
  const asOfTime = new Date(asOfDate + 'T23:59:59.999Z').getTime();

  const customerMap = new Map<string, ARAgingRow>();

  invoices
    .filter(invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled')
    .forEach(invoice => {
      const outstanding = round2(Math.max(0, invoice.total - invoice.amountPaid));
      if (outstanding <= 0) return;

      const dueTime = new Date(invoice.dueDate).getTime();
      const daysPastDue = Math.floor((asOfTime - dueTime) / 86400000);
      const bucket = bucketAmount(daysPastDue, outstanding);

      const existing: ARAgingRow = customerMap.get(invoice.customerId) ?? {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        current: 0,
        bucket1to30: 0,
        bucket31to60: 0,
        bucket61to90: 0,
        bucket90Plus: 0,
        total: 0,
      };

      existing.current = round2(existing.current + bucket.current);
      existing.bucket1to30 = round2(existing.bucket1to30 + bucket.bucket1to30);
      existing.bucket31to60 = round2(existing.bucket31to60 + bucket.bucket31to60);
      existing.bucket61to90 = round2(existing.bucket61to90 + bucket.bucket61to90);
      existing.bucket90Plus = round2(existing.bucket90Plus + bucket.bucket90Plus);
      existing.total = round2(existing.total + outstanding);

      customerMap.set(invoice.customerId, existing);
    });

  const rows = Array.from(customerMap.values()).sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (acc, row) => {
      acc.current += row.current;
      acc.bucket1to30 += row.bucket1to30;
      acc.bucket31to60 += row.bucket31to60;
      acc.bucket61to90 += row.bucket61to90;
      acc.bucket90Plus += row.bucket90Plus;
      acc.total += row.total;
      return acc;
    },
    { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0, total: 0 },
  );

  return simulateApiCall(
    envelope<ARAgingReport>({
      asOfDate,
      rows,
      totals: {
        current: round2(totals.current),
        bucket1to30: round2(totals.bucket1to30),
        bucket31to60: round2(totals.bucket31to60),
        bucket61to90: round2(totals.bucket61to90),
        bucket90Plus: round2(totals.bucket90Plus),
        total: round2(totals.total),
      },
    }),
    450,
  );
};
