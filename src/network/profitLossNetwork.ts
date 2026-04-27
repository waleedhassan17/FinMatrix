import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { bills } from '../dummy-data/bills';
import { round2, type ReportDateRange } from '../models/reportModel';
import {
  type ProfitLossReport,
  type ProfitLossReportResponse,
} from '../models/profitLossModel';
import { envelope, inDateRange, postedEntries } from './_reportHelpers';

const calculateProfitLossForRange = (
  range: ReportDateRange,
): Omit<ProfitLossReport, 'range' | 'comparisonRange' | 'comparison'> => {
  const scopedInvoices = invoices.filter(
    invoice =>
      inDateRange(invoice.issueDate, range.startDate, range.endDate) &&
      invoice.status !== 'draft' &&
      invoice.status !== 'cancelled',
  );

  const scopedBills = bills.filter(
    bill => inDateRange(bill.issueDate, range.startDate, range.endDate) && bill.status !== 'draft',
  );

  const revenue = scopedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const cogs = scopedBills.reduce((sum, bill) => {
    const cogsLines = bill.lines.filter(line =>
      line.accountId === 'acct-5000' ||
      line.accountName.toLowerCase().includes('cost of goods sold'),
    );
    return sum + cogsLines.reduce((lineSum, line) => lineSum + line.amount, 0);
  }, 0);

  const operatingExpensesFromBills = scopedBills.reduce((sum, bill) => {
    const expenseLines = bill.lines.filter(line =>
      line.accountId !== 'acct-5000' &&
      !line.accountName.toLowerCase().includes('cost of goods sold'),
    );
    return sum + expenseLines.reduce((lineSum, line) => lineSum + line.amount, 0);
  }, 0);

  const payrollExpense = postedEntries()
    .filter(entry => inDateRange(entry.date, range.startDate, range.endDate))
    .reduce((sum, entry) => {
      const payrollLine = entry.lines.find(line => line.accountId === 'acct-5000' && line.debit > 0);
      return sum + (payrollLine?.debit ?? 0);
    }, 0);

  const expenses = operatingExpensesFromBills + payrollExpense;
  const grossProfit = revenue - cogs;
  const netIncome = grossProfit - expenses;

  return {
    revenue: round2(revenue),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    expenses: round2(expenses),
    netIncome: round2(netIncome),
  };
};

export const getProfitLossReportAPI = async (
  range: ReportDateRange,
  comparisonRange?: ReportDateRange,
): Promise<ProfitLossReportResponse> => {
  const current = calculateProfitLossForRange(range);
  const comparison = comparisonRange ? calculateProfitLossForRange(comparisonRange) : undefined;

  return simulateApiCall(
    envelope<ProfitLossReport>({
      range,
      comparisonRange: comparisonRange ?? null,
      ...current,
      comparison,
    }),
    450,
  );
};
