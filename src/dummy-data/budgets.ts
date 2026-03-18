import type { AnnualBudget } from '../models/budgetModel';
import { calculateLineTotal } from '../models/budgetModel';

const mkMonthly = (
  jan: number,
  feb: number,
  mar: number,
  apr: number,
  may: number,
  jun: number,
  jul: number,
  aug: number,
  sep: number,
  oct: number,
  nov: number,
  dec: number,
) => ({ jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec });

const baseLines = [
  {
    id: 'bl_001',
    accountId: 'acct-4000',
    accountCode: '4000',
    accountName: 'Sales Revenue',
    monthly: mkMonthly(420000, 430000, 445000, 452000, 468000, 475000, 485000, 492000, 505000, 515000, 525000, 540000),
  },
  {
    id: 'bl_002',
    accountId: 'acct-5000',
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
    monthly: mkMonthly(245000, 252000, 260000, 266000, 273000, 278000, 284000, 289000, 295000, 302000, 309000, 316000),
  },
  {
    id: 'bl_003',
    accountId: 'acct-6200',
    accountCode: '6200',
    accountName: 'Salaries & Wages',
    monthly: mkMonthly(98000, 98000, 102000, 102000, 104000, 104000, 108000, 108000, 112000, 112000, 116000, 120000),
  },
  {
    id: 'bl_004',
    accountId: 'acct-6000',
    accountCode: '6000',
    accountName: 'Rent Expense',
    monthly: mkMonthly(42000, 42000, 42000, 42000, 42000, 42000, 44500, 44500, 44500, 44500, 44500, 44500),
  },
  {
    id: 'bl_005',
    accountId: 'acct-6600',
    accountCode: '6600',
    accountName: 'Marketing & Advertising',
    monthly: mkMonthly(18000, 19000, 21000, 22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000, 40000),
  },
].map(line => ({ ...line, total: calculateLineTotal(line.monthly) }));

export const budgetsData: AnnualBudget[] = [
  {
    id: 'budget_2026_main',
    companyId: 'comp_001',
    fiscalYear: 2026,
    name: 'FY 2026 Operating Budget',
    notes: 'Baseline annual budget for revenue and core operating accounts.',
    lines: baseLines,
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-01T09:00:00Z',
  },
];
