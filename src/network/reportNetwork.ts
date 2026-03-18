import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { invoices } from '../dummy-data/invoices';
import { bills } from '../dummy-data/bills';
import { journalEntriesData } from '../dummy-data/journalEntries';
import { inventoryItemsData } from '../dummy-data/inventoryItems';
import { deliveryRecords } from '../dummy-data/deliveries';
import { dummyDeliveryPersonnel } from '../dummy-data/deliveryPersonnel';
import {
  type AnalyticsDashboardData,
  type ARAgingReport,
  type BalanceSheetLine,
  type BalanceSheetReport,
  type CashFlowLine,
  type CashFlowReport,
  type DeliveryAgencyCount,
  type DeliveryDailyReport,
  type DeliveryPerformanceReport,
  type DeliveryPerformanceRow,
  type DeliveryPersonnelStat,
  type DeliveryTrendPoint,
  type InventoryValuationReport,
  type ProfitLossReport,
  type ReportDateRange,
  type SalesByCustomerReport,
  type SalesByCustomerRow,
  type SalesByItemReport,
  type SalesByItemRow,
  type SalesTaxReport,
  type SalesTaxRow,
  type TrialBalanceReport,
  type TrialBalanceRow,
  asOf,
  round2,
  withinRange,
} from '../models/reportModel';
import type { Account, JournalEntry, JournalEntryLine } from '../types';

const CASH_ACCOUNT_IDS = new Set(['acct-1000', 'acct-1010', 'acct-1020']);

const postedEntries = (): JournalEntry[] => journalEntriesData.filter(entry => entry.status === 'posted');

const inDateRange = (date: string, startDate: string, endDate: string): boolean => {
  return withinRange(date, { startDate, endDate });
};

const initialBalanceByAccount = (): Record<string, number> => {
  return chartOfAccountsData.reduce<Record<string, number>>((acc, account) => {
    acc[account.id] = account.balance;
    return acc;
  }, {});
};

const applyLineToBalance = (account: Account, line: JournalEntryLine): number => {
  if (account.normalBalance === 'debit') {
    return line.debit - line.credit;
  }
  return line.credit - line.debit;
};

const buildBalancesAsOf = (asOfDate: string): Record<string, number> => {
  const accountMap = new Map(chartOfAccountsData.map(account => [account.id, account]));
  const balances = initialBalanceByAccount();

  postedEntries()
    .filter(entry => asOf(entry.date, asOfDate))
    .forEach(entry => {
      entry.lines.forEach(line => {
        const account = accountMap.get(line.accountId);
        if (!account) {
          return;
        }
        balances[line.accountId] = round2((balances[line.accountId] ?? 0) + applyLineToBalance(account, line));
      });
    });

  return balances;
};

const balanceToTrialColumns = (balance: number, normalBalance: 'debit' | 'credit'): { debit: number; credit: number } => {
  if (normalBalance === 'debit') {
    if (balance >= 0) {
      return { debit: round2(balance), credit: 0 };
    }
    return { debit: 0, credit: round2(Math.abs(balance)) };
  }

  if (balance >= 0) {
    return { debit: 0, credit: round2(balance) };
  }
  return { debit: round2(Math.abs(balance)), credit: 0 };
};

const bucketAmount = (
  daysPastDue: number,
  amount: number,
): { current: number; bucket1to30: number; bucket31to60: number; bucket61to90: number; bucket90Plus: number } => {
  if (daysPastDue <= 0) {
    return { current: amount, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 30) {
    return { current: 0, bucket1to30: amount, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 60) {
    return { current: 0, bucket1to30: 0, bucket31to60: amount, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 90) {
    return { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: amount, bucket90Plus: 0 };
  }
  return { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: amount };
};

const calculateProfitLossForRange = (range: ReportDateRange): Omit<ProfitLossReport, 'range' | 'comparisonRange' | 'comparison'> => {
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
      line.accountId === 'acct-5000' || line.accountName.toLowerCase().includes('cost of goods sold'),
    );
    return sum + cogsLines.reduce((lineSum, line) => lineSum + line.amount, 0);
  }, 0);

  const operatingExpensesFromBills = scopedBills.reduce((sum, bill) => {
    const expenseLines = bill.lines.filter(line =>
      line.accountId !== 'acct-5000' && !line.accountName.toLowerCase().includes('cost of goods sold'),
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
): Promise<ProfitLossReport> => {
  const current = calculateProfitLossForRange(range);
  const comparison = comparisonRange ? calculateProfitLossForRange(comparisonRange) : undefined;

  return simulateApiCall(
    {
      range,
      comparisonRange: comparisonRange ?? null,
      ...current,
      comparison,
    },
    450,
  );
};

export const getTrialBalanceReportAPI = async (asOfDate: string): Promise<TrialBalanceReport> => {
  const balances = buildBalancesAsOf(asOfDate);

  const rows: TrialBalanceRow[] = chartOfAccountsData
    .filter(account => account.isActive)
    .map(account => {
      const balance = balances[account.id] ?? 0;
      const { debit, credit } = balanceToTrialColumns(balance, account.normalBalance);
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit,
      };
    })
    .filter(row => row.debit !== 0 || row.credit !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebit = round2(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = round2(rows.reduce((sum, row) => sum + row.credit, 0));

  return simulateApiCall({ asOfDate, rows, totalDebit, totalCredit }, 450);
};

export const getBalanceSheetReportAPI = async (asOfDate: string): Promise<BalanceSheetReport> => {
  const balances = buildBalancesAsOf(asOfDate);

  const toLine = (account: Account): BalanceSheetLine => ({
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    amount: round2(balances[account.id] ?? 0),
  });

  const assets = chartOfAccountsData
    .filter(account => account.type === 'asset' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const liabilities = chartOfAccountsData
    .filter(account => account.type === 'liability' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const equity = chartOfAccountsData
    .filter(account => account.type === 'equity' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalAssets = round2(assets.reduce((sum, line) => sum + line.amount, 0));
  const totalLiabilities = round2(liabilities.reduce((sum, line) => sum + line.amount, 0));
  let totalEquity = round2(equity.reduce((sum, line) => sum + line.amount, 0));

  const difference = round2(totalAssets - (totalLiabilities + totalEquity));
  if (difference !== 0) {
    equity.push({
      accountId: 'auto-balance-equity',
      accountCode: '9999',
      accountName: 'Current Period Earnings (Auto Balance)',
      amount: difference,
    });
    totalEquity = round2(totalEquity + difference);
  }

  const isBalanced = round2(totalAssets - (totalLiabilities + totalEquity)) === 0;

  return simulateApiCall(
    {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced,
    },
    450,
  );
};

const classifyCashFlowGroup = (counterparts: JournalEntryLine[]): 'operating' | 'investing' | 'financing' => {
  const accountMap = new Map(chartOfAccountsData.map(account => [account.id, account]));
  const counterpartAccounts = counterparts
    .map(line => accountMap.get(line.accountId))
    .filter((account): account is Account => Boolean(account));

  if (
    counterpartAccounts.some(
      account => account.type === 'equity' || account.subType === 'long_term_liability' || account.code === '2500',
    )
  ) {
    return 'financing';
  }

  if (counterpartAccounts.some(account => account.subType === 'fixed_asset')) {
    return 'investing';
  }

  return 'operating';
};

export const getCashFlowReportAPI = async (range: ReportDateRange): Promise<CashFlowReport> => {
  const operating: CashFlowLine[] = [];
  const investing: CashFlowLine[] = [];
  const financing: CashFlowLine[] = [];

  postedEntries()
    .filter(entry => inDateRange(entry.date, range.startDate, range.endDate))
    .forEach(entry => {
      const cashLines = entry.lines.filter(line => CASH_ACCOUNT_IDS.has(line.accountId));
      if (cashLines.length === 0) {
        return;
      }

      const amount = round2(cashLines.reduce((sum, line) => sum + line.debit - line.credit, 0));
      if (amount === 0) {
        return;
      }

      const counterpartLines = entry.lines.filter(line => !CASH_ACCOUNT_IDS.has(line.accountId));
      const group = classifyCashFlowGroup(counterpartLines);
      const line: CashFlowLine = {
        id: entry.id,
        label: `${entry.entryNumber} - ${entry.description}`,
        amount,
      };

      if (group === 'operating') {
        operating.push(line);
      } else if (group === 'investing') {
        investing.push(line);
      } else {
        financing.push(line);
      }
    });

  const operatingTotal = round2(operating.reduce((sum, line) => sum + line.amount, 0));
  const investingTotal = round2(investing.reduce((sum, line) => sum + line.amount, 0));
  const financingTotal = round2(financing.reduce((sum, line) => sum + line.amount, 0));
  const netCashFlow = round2(operatingTotal + investingTotal + financingTotal);

  return simulateApiCall(
    {
      range,
      operating,
      investing,
      financing,
      operatingTotal,
      investingTotal,
      financingTotal,
      netCashFlow,
    },
    450,
  );
};

export const getARAgingReportAPI = async (asOfDate: string): Promise<ARAgingReport> => {
  const asOfTime = new Date(asOfDate + 'T23:59:59.999Z').getTime();

  const customerMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      current: number;
      bucket1to30: number;
      bucket31to60: number;
      bucket61to90: number;
      bucket90Plus: number;
      total: number;
    }
  >();

  invoices
    .filter(invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled')
    .forEach(invoice => {
      const outstanding = round2(Math.max(0, invoice.total - invoice.amountPaid));
      if (outstanding <= 0) {
        return;
      }

      const dueTime = new Date(invoice.dueDate).getTime();
      const daysPastDue = Math.floor((asOfTime - dueTime) / 86400000);
      const bucket = bucketAmount(daysPastDue, outstanding);

      const existing = customerMap.get(invoice.customerId) ?? {
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
    {
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
    },
    450,
  );
};

export const getInventoryValuationReportAPI = async (): Promise<InventoryValuationReport> => {
  const rows = inventoryItemsData
    .filter(item => item.isActive)
    .map(item => {
      const value = round2(item.quantityOnHand * item.unitCost);
      return {
        itemId: item.itemId,
        itemName: item.name,
        sku: item.sku,
        category: item.category,
        qty: item.quantityOnHand,
        cost: round2(item.unitCost),
        value,
      };
    })
    .sort((a, b) => {
      if (a.category === b.category) {
        return a.itemName.localeCompare(b.itemName);
      }
      return a.category.localeCompare(b.category);
    });

  const categoryMap = new Map<string, number>();
  rows.forEach(row => {
    categoryMap.set(row.category, round2((categoryMap.get(row.category) ?? 0) + row.value));
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, totalValue]) => ({ category, totalValue }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalValue = round2(rows.reduce((sum, row) => sum + row.value, 0));

  return simulateApiCall({ rows, byCategory, totalValue }, 450);
};

const monthLabel = (date: Date): string =>
  date.toLocaleString('en-US', { month: 'short' });

const makeLastNMonths = (months: number): Array<{ key: string; label: string; start: Date; end: Date }> => {
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

export const getAnalyticsDashboardAPI = async (): Promise<AnalyticsDashboardData> => {
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
        if (outstanding <= 0) {
          return;
        }
        const daysPastDue = Math.floor((asOfTime - new Date(invoice.dueDate).getTime()) / 86400000);
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
    {
      revenueTrend,
      expenseCategories,
      cashFlowTrend,
      topCustomers,
      arAgingTrend,
    },
    500,
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Daily Report
// ─────────────────────────────────────────────────────────────────────────────
export const getDeliveryDailyReportAPI = (date: string): Promise<DeliveryDailyReport> => {
  const dayDeliveries = deliveryRecords.filter(d => d.scheduledDate === date);
  const total = dayDeliveries.length;
  const completed = dayDeliveries.filter(d => d.status === 'delivered').length;
  const failed = dayDeliveries.filter(d => d.status === 'failed' || d.status === 'returned').length;
  const onTimePercent = total > 0 ? round2((completed / total) * 100) : 0;

  const personnelLookup = new Map(dummyDeliveryPersonnel.map(p => [p.userId, p]));
  const statsMap = new Map<string, DeliveryPersonnelStat>();

  dayDeliveries.forEach(delivery => {
    if (!delivery.assignedTo) return;
    const person = personnelLookup.get(delivery.assignedTo);
    if (!person) return;
    if (!statsMap.has(delivery.assignedTo)) {
      statsMap.set(delivery.assignedTo, {
        personId: delivery.assignedTo,
        name: person.displayName,
        total: 0,
        delivered: 0,
        failed: 0,
        onTimeRate: person.onTimeRate,
      });
    }
    const stat = statsMap.get(delivery.assignedTo)!;
    stat.total += 1;
    if (delivery.status === 'delivered') stat.delivered += 1;
    if (delivery.status === 'failed' || delivery.status === 'returned') stat.failed += 1;
  });

  const agencyMap = new Map<string, DeliveryAgencyCount>();
  dayDeliveries.forEach(delivery => {
    const seenAgencies = new Set<string>();
    delivery.items.forEach(item => {
      if (seenAgencies.has(item.agencyId)) return;
      seenAgencies.add(item.agencyId);
      if (!agencyMap.has(item.agencyId)) {
        agencyMap.set(item.agencyId, { agencyId: item.agencyId, agencyName: item.agencyName, count: 0 });
      }
      agencyMap.get(item.agencyId)!.count += 1;
    });
  });

  return simulateApiCall({
    date,
    total,
    completed,
    failed,
    onTimePercent,
    personnelStats: Array.from(statsMap.values()),
    agencyDistribution: Array.from(agencyMap.values()),
  }, 300);
};

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Performance Report
// ─────────────────────────────────────────────────────────────────────────────
export const getDeliveryPerformanceAPI = (range: ReportDateRange): Promise<DeliveryPerformanceReport> => {
  const { startDate, endDate } = range;
  const rangeDeliveries = deliveryRecords.filter(
    d => d.assignedTo && d.scheduledDate >= startDate && d.scheduledDate <= endDate,
  );

  const personnelLookup = new Map(dummyDeliveryPersonnel.map(p => [p.userId, p]));
  const rowMap = new Map<string, DeliveryPerformanceRow>();

  rangeDeliveries.forEach(d => {
    const person = personnelLookup.get(d.assignedTo!);
    if (!person) return;
    if (!rowMap.has(d.assignedTo!)) {
      rowMap.set(d.assignedTo!, {
        personId: d.assignedTo!,
        name: person.displayName,
        total: 0,
        delivered: 0,
        failed: 0,
        onTimeRate: person.onTimeRate,
      });
    }
    const row = rowMap.get(d.assignedTo!)!;
    row.total += 1;
    if (d.status === 'delivered') row.delivered += 1;
    if (d.status === 'failed' || d.status === 'returned') row.failed += 1;
  });

  const trendMap = new Map<string, DeliveryTrendPoint>();
  rangeDeliveries.forEach(d => {
    const label = d.scheduledDate.slice(5).replace('-', '/');
    if (!trendMap.has(d.scheduledDate)) {
      trendMap.set(d.scheduledDate, { label, delivered: 0, failed: 0 });
    }
    const pt = trendMap.get(d.scheduledDate)!;
    if (d.status === 'delivered') pt.delivered += 1;
    if (d.status === 'failed' || d.status === 'returned') pt.failed += 1;
  });

  return simulateApiCall({
    rows: Array.from(rowMap.values()),
    dailyTrend: Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, pt]) => pt),
  }, 300);
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales By Customer
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesByCustomerAPI = (range: ReportDateRange): Promise<SalesByCustomerReport> => {
  const validInvoices = invoices.filter(
    inv => inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
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

  return simulateApiCall({ rows, totalSales: round2(rows.reduce((s, r) => s + r.totalSales, 0)) }, 300);
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales By Item
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesByItemAPI = (range: ReportDateRange): Promise<SalesByItemReport> => {
  const costLookup = new Map(inventoryItemsData.map(item => [item.itemId, item.unitCost]));
  const validInvoices = invoices.filter(
    inv => inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
  );

  const itemMap = new Map<string, SalesByItemRow>();
  validInvoices.forEach(inv => {
    inv.lines.forEach(line => {
      if (!itemMap.has(line.itemId)) {
        itemMap.set(line.itemId, {
          itemId: line.itemId,
          itemName: line.itemName,
          qtySold: 0,
          revenue: 0,
          profit: 0,
          profitMargin: 0,
        });
      }
      const row = itemMap.get(line.itemId)!;
      const unitCost = costLookup.get(line.itemId) ?? 0;
      row.qtySold += line.quantity;
      row.revenue = round2(row.revenue + line.amount);
      row.profit = round2(row.profit + line.amount - line.quantity * unitCost);
    });
  });

  const rows = Array.from(itemMap.values()).map(r => ({
    ...r,
    profitMargin: r.revenue > 0 ? round2((r.profit / r.revenue) * 100) : 0,
  }));

  return simulateApiCall({
    rows,
    totalRevenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
    totalProfit: round2(rows.reduce((s, r) => s + r.profit, 0)),
  }, 300);
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales Tax Report
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesTaxReportAPI = (range: ReportDateRange): Promise<SalesTaxReport> => {
  const validInvoices = invoices.filter(
    inv => inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
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

  return simulateApiCall({
    range,
    rows,
    totalCollected,
    totalPaid,
    totalNetLiability: round2(totalCollected - totalPaid),
  }, 300);
};
