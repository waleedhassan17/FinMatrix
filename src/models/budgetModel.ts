// ─── API envelope (GL pattern) ────────────────────────────────────────────────
// Every budget network function returns `{ success, data }`. Matching
// serializer in src/serializers/budgetSerializer.ts unwraps `data` for slices.
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

export type MonthKey = (typeof MONTH_KEYS)[number];

export interface BudgetMonthlyAmounts {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export interface BudgetAccountLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  monthly: BudgetMonthlyAmounts;
  total: number;
}

export interface AnnualBudget {
  id: string;
  companyId: string;
  fiscalYear: number;
  name: string;
  notes: string;
  lines: BudgetAccountLine[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetVarianceRow {
  lineId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
}

export interface BudgetComparisonResult {
  budgetId: string;
  fiscalYear: number;
  rows: BudgetVarianceRow[];
  totals: {
    budget: number;
    actual: number;
    variance: number;
    variancePct: number;
  };
}

export const emptyMonthlyAmounts = (): BudgetMonthlyAmounts => ({
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
});

export const cloneMonthly = (monthly: BudgetMonthlyAmounts): BudgetMonthlyAmounts => ({ ...monthly });

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const calculateLineTotal = (monthly: BudgetMonthlyAmounts): number =>
  round2(MONTH_KEYS.reduce((sum, key) => sum + (monthly[key] ?? 0), 0));

export const calculateBudgetTotal = (lines: BudgetAccountLine[]): number =>
  round2(lines.reduce((sum, line) => sum + line.total, 0));

// ─── Envelope response type aliases ──────────────────────────────────────────
export type BudgetListResponse = ApiEnvelope<AnnualBudget[]>;
export type BudgetSingleResponse = ApiEnvelope<AnnualBudget>;
export type BudgetCopyResponse = ApiEnvelope<AnnualBudget | null>;
export type BudgetComparisonResponse = ApiEnvelope<BudgetComparisonResult>;

export const distributeEvenly = (annualAmount: number): BudgetMonthlyAmounts => {
  const normalized = Math.max(0, annualAmount);
  const perMonth = round2(normalized / 12);
  const monthly = emptyMonthlyAmounts();
  MONTH_KEYS.forEach(key => {
    monthly[key] = perMonth;
  });

  const runningTotal = calculateLineTotal(monthly);
  const diff = round2(normalized - runningTotal);
  if (diff !== 0) {
    monthly.dec = round2(monthly.dec + diff);
  }

  return monthly;
};
