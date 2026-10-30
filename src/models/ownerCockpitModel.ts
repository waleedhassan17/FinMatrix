// ═══════════════════════════════════════════════════════
// FinMatrix — Owner Cockpit (GET /reports/analytics, reports v2)
// ═══════════════════════════════════════════════════════
// The period an owner picks beside the one before it, computed on the server:
// ledger-based monthly series (zero-filled, apportioned to foot to the
// statements), the KPIs with their prior value and change, where the money
// went, who bought, the budget when there is one, and financial health at the
// period's end. The comparison period is the server's choice, not the phone's.

import type { ReportDateRange } from './reportModel';
import type { FinancialHealth, KpiAssessment, KpiWithChange } from './kpiModel';
import type { BudgetVsActual } from './budgetModel';
import type { BusinessInsight } from './insightModel';

export interface CockpitSeriesPoint {
  period: string;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netIncome: number;
  operatingCashFlow: number;
  /** Cash + Bank at the month's end; null for a month the server has no close for. */
  endingCash: number | null;
}

export interface CockpitCustomer {
  customerId: string;
  name: string;
  amount: number;
  invoices: number;
  /** Share of invoiced sales (0–100), from the server. */
  sharePct: number | null;
}

export interface CockpitSales {
  /** 'invoice' — the ledger does not record revenue by customer. */
  basis: string;
  label: string;
  note: string;
  total: number;
  customers: CockpitCustomer[];
  /** Everyone beyond the top ones, folded by the server. */
  other: { count: number; amount: number; sharePct: number | null };
  top5SharePct: number | null;
  /** The top-five share against its rule of thumb. */
  assessment: KpiAssessment | null;
}

export interface OwnerCockpit {
  range: ReportDateRange;
  comparisonRange: ReportDateRange | null;
  fiscalYearStart: string | null;
  series: CockpitSeriesPoint[];
  kpis: KpiWithChange[];
  /**
   * The top operating-expense accounts, then the server's "Other". `sharePct`
   * is each line's share of operating expenses — null for a credit.
   */
  expenseByAccount: { accountCode: string; accountName: string; amount: number; sharePct: number | null }[];
  salesByCustomer: CockpitSales | null;
  /** The active budget the range touches; null when there is none. */
  budgetVsActual: (BudgetVsActual & { basis: string }) | null;
  health: FinancialHealth | null;
  /** What stands out, most pressing first — the server's sentences. Empty from an older server. */
  insights: BusinessInsight[];
}

export type CockpitSeriesKey = 'revenue' | 'grossProfit' | 'netIncome';

export const COCKPIT_SERIES: { key: CockpitSeriesKey; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'grossProfit', label: 'Gross profit' },
  { key: 'netIncome', label: 'Net profit' },
];

/** The four headline figures, in the order both clients show them. */
export const HERO_KPIS = ['revenue', 'grossProfit', 'netIncome', 'endingCash'];

/** How many expense accounts and customers the server names before Other — the donut's five. */
export const COCKPIT_TOP = { expenseTop: 5, customerTop: 5 } as const;

/** Which report a KPI card opens. */
export type CockpitTarget =
  | { screen: 'ProfitLoss' }
  | { screen: 'CashFlow' }
  | { screen: 'ARAging' }
  | { screen: 'APAging' }
  | { screen: 'InventoryValuation' }
  | { screen: 'BalanceSheet' };

export const KPI_TARGET: Record<string, CockpitTarget['screen']> = {
  revenue: 'ProfitLoss',
  grossProfit: 'ProfitLoss',
  netIncome: 'ProfitLoss',
  grossMarginPct: 'ProfitLoss',
  netMarginPct: 'ProfitLoss',
  operatingExpenses: 'ProfitLoss',
  operatingCashFlow: 'CashFlow',
  endingCash: 'CashFlow',
  runwayMonths: 'CashFlow',
  dso: 'ARAging',
  dpo: 'APAging',
  dio: 'InventoryValuation',
  ccc: 'BalanceSheet',
};

/** The KPIs in a list, in a given order, skipping any the server did not send. */
export const pickKpis = (kpis: KpiWithChange[], keys: string[]): KpiWithChange[] =>
  keys.map(k => kpis.find(x => x.key === k)).filter((k): k is KpiWithChange => !!k);
