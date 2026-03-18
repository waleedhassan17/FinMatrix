import { simulateApiCall } from './apiHelpers';
import { budgetsData } from '../dummy-data/budgets';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { journalEntriesData } from '../dummy-data/journalEntries';
import {
  MONTH_KEYS,
  type AnnualBudget,
  type BudgetAccountLine,
  type BudgetComparisonResult,
  type BudgetMonthlyAmounts,
  calculateLineTotal,
  round2,
} from '../models/budgetModel';

let budgetStore: AnnualBudget[] = budgetsData.map(budget => ({
  ...budget,
  lines: budget.lines.map(line => ({ ...line, monthly: { ...line.monthly } })),
}));

const cloneBudget = (budget: AnnualBudget): AnnualBudget => ({
  ...budget,
  lines: budget.lines.map(line => ({
    ...line,
    monthly: { ...line.monthly },
  })),
});

const monthFromDate = (date: string): MonthKey => {
  const month = new Date(date).getMonth();
  return MONTH_KEYS[month] ?? 'jan';
};

type MonthKey = keyof BudgetMonthlyAmounts;

const accountActualByMonth = (accountId: string, fiscalYear: number): BudgetMonthlyAmounts => {
  const account = chartOfAccountsData.find(a => a.id === accountId);
  const monthly: BudgetMonthlyAmounts = {
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
  };

  if (!account) {
    return monthly;
  }

  journalEntriesData
    .filter(entry => entry.status === 'posted')
    .forEach(entry => {
      const year = new Date(entry.date).getFullYear();
      if (year !== fiscalYear) {
        return;
      }

      entry.lines
        .filter(line => line.accountId === accountId)
        .forEach(line => {
          const key = monthFromDate(entry.date);
          const amount = account.normalBalance === 'debit'
            ? line.debit - line.credit
            : line.credit - line.debit;
          monthly[key] = round2(monthly[key] + amount);
        });
    });

  return monthly;
};

export const getBudgetsAPI = async (): Promise<AnnualBudget[]> => {
  const sorted = [...budgetStore].sort((a, b) => b.fiscalYear - a.fiscalYear);
  return simulateApiCall(sorted.map(cloneBudget), 420);
};

export const getBudgetByIdAPI = async (budgetId: string): Promise<AnnualBudget> => {
  const found = budgetStore.find(budget => budget.id === budgetId);
  if (!found) {
    throw new Error('Budget not found');
  }
  return simulateApiCall(cloneBudget(found), 350);
};

export const saveBudgetAPI = async (budget: AnnualBudget): Promise<AnnualBudget> => {
  const normalizedLines: BudgetAccountLine[] = budget.lines.map(line => {
    const monthly = { ...line.monthly };
    return {
      ...line,
      monthly,
      total: calculateLineTotal(monthly),
    };
  });

  const next: AnnualBudget = {
    ...budget,
    lines: normalizedLines,
    updatedAt: new Date().toISOString(),
  };

  const idx = budgetStore.findIndex(existing => existing.id === budget.id);
  if (idx >= 0) {
    budgetStore[idx] = next;
  } else {
    budgetStore.unshift({
      ...next,
      createdAt: new Date().toISOString(),
    });
  }

  return simulateApiCall(cloneBudget(next), 480);
};

export const copyBudgetFromLastYearAPI = async (fiscalYear: number): Promise<AnnualBudget | null> => {
  const prior = budgetStore.find(budget => budget.fiscalYear === fiscalYear - 1);
  return simulateApiCall(prior ? cloneBudget(prior) : null, 300);
};

export const getBudgetComparisonAPI = async (budgetId: string): Promise<BudgetComparisonResult> => {
  const budget = budgetStore.find(item => item.id === budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }

  const rows = budget.lines.map(line => {
    const actualMonthly = accountActualByMonth(line.accountId, budget.fiscalYear);
    const actual = round2(MONTH_KEYS.reduce((sum, key) => sum + actualMonthly[key], 0));
    const variance = round2(actual - line.total);
    const variancePct = line.total !== 0 ? round2((variance / line.total) * 100) : 0;

    return {
      lineId: line.id,
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      budget: line.total,
      actual,
      variance,
      variancePct,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.budget += row.budget;
      acc.actual += row.actual;
      acc.variance += row.variance;
      return acc;
    },
    { budget: 0, actual: 0, variance: 0 },
  );

  const result: BudgetComparisonResult = {
    budgetId: budget.id,
    fiscalYear: budget.fiscalYear,
    rows,
    totals: {
      budget: round2(totals.budget),
      actual: round2(totals.actual),
      variance: round2(totals.variance),
      variancePct: totals.budget !== 0 ? round2((totals.variance / totals.budget) * 100) : 0,
    },
  };

  return simulateApiCall(result, 500);
};
