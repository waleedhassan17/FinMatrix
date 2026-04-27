import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { bills } from '../dummy-data/bills';
import { round2 } from '../models/reportModel';
import {
  type AnalyticsDashboardData,
  type AnalyticsDashboardResponse,
} from '../models/analyticsDashboardModel';
import { CASH_ACCOUNT_IDS, bucketAmount, envelope, postedEntries } from './_reportHelpers';

const monthLabel = (date: Date): string => date.toLocaleString('en-US', { month: 'short' });

const makeLastNMonths = (
  months: number,
): Array<{ key: string; label: string; start: Date; end: Date }> => {
  const now = new Date();
  const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    result.push({ key, label: monthLabel(month), start, end });
  }

  return result;
};

const isWithinMonth = (dateValue: string, start: Date, end: Date): boolean => {
  const t = new Date(dateValue).getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export const getAnalyticsDashboardAPI = async (): Promise<AnalyticsDashboardResponse> => {
  const months = makeLastNMonths(6);

  const revenueTrend = months.map(month => {
    const value = invoices
      .filter(invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled')
      .filter(invoice => isWithinMonth(invoice.issueDate, month.start, month.end))
      .reduce((sum, invoice) => sum + invoice.total, 0);
    return { label: month.label, value: round2(value) };
  });

  const expenseMap = new Map<string, number>();
  bills
    .filter(bill => bill.status !== 'draft')
    .forEach(bill => {
      bill.lines.forEach(line => {
        const key = line.accountName;
        expenseMap.set(key, round2((expenseMap.get(key) ?? 0) + line.amount));
      });
    });

  const expenseCategories = Array.from(expenseMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const cashFlowTrend = months.map(month => {
    const value = postedEntries()
      .filter(entry => isWithinMonth(entry.date, month.start, month.end))
      .reduce((sum, entry) => {
        const cashMovement = entry.lines
          .filter(line => CASH_ACCOUNT_IDS.has(line.accountId))
          .reduce((lineSum, line) => lineSum + line.debit - line.credit, 0);
        return sum + cashMovement;
      }, 0);
    return { label: month.label, value: round2(value) };
  });

  const topCustomers = Array.from(
    invoices
      .filter(invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled')
      .reduce<Map<string, number>>((map, invoice) => {
        map.set(invoice.customerName, round2((map.get(invoice.customerName) ?? 0) + invoice.total));
        return map;
      }, new Map()),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const arAgingTrend = months.map(month => {
    const asOfTime = month.end.getTime();
    const totals = {
      current: 0,
      bucket1to30: 0,
      bucket31to60: 0,
      bucket61to90: 0,
      bucket90Plus: 0,
    };

    invoices
      .filter(invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled')
      .forEach(invoice => {
        const outstanding = round2(Math.max(0, invoice.total - invoice.amountPaid));
        if (outstanding <= 0) return;
        const daysPastDue = Math.floor(
          (asOfTime - new Date(invoice.dueDate).getTime()) / 86400000,
        );
        const bucket = bucketAmount(daysPastDue, outstanding);
        totals.current += bucket.current;
        totals.bucket1to30 += bucket.bucket1to30;
        totals.bucket31to60 += bucket.bucket31to60;
        totals.bucket61to90 += bucket.bucket61to90;
        totals.bucket90Plus += bucket.bucket90Plus;
      });

    return {
      label: month.label,
      current: round2(totals.current),
      bucket1to30: round2(totals.bucket1to30),
      bucket31to60: round2(totals.bucket31to60),
      bucket61to90: round2(totals.bucket61to90),
      bucket90Plus: round2(totals.bucket90Plus),
    };
  });

  return simulateApiCall(
    envelope<AnalyticsDashboardData>({
      revenueTrend,
      expenseCategories,
      cashFlowTrend,
      topCustomers,
      arAgingTrend,
    }),
    500,
  );
};
