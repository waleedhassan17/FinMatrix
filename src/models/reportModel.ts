// ─── Shared Reports infrastructure (GL pattern) ──────────────────────────────
// Per-feature types live in their own model files (e.g. profitLossModel.ts,
// balanceSheetModel.ts, cashFlowModel.ts). This file holds only types and
// helpers shared across every report feature: ApiEnvelope, ReportDateRange,
// range helpers, the Reports-Hub navigation model.

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface ReportHubItem {
  key: string;
  title: string;
  icon: string;
  /** Three-tier model: item only shows when this feature is on. */
  feature?: string;
  target:
    | 'ProfitLoss'
    | 'BalanceSheet'
    | 'CashFlow'
    | 'TrialBalance'
    | 'GeneralLedger'
    | 'ARAging'
    | 'InventoryValuation'
    | 'AnalyticsDashboard'
    | 'BudgetList'
    | 'DeliveryDailyReport'
    | 'DeliveryPerformance'
    | 'SalesByCustomer'
    | 'SalesByItem'
    | 'SalesTaxReport';
}

export interface ReportHubCategory {
  key: string;
  title: string;
  icon: string;
  items: ReportHubItem[];
  /** Three-tier model: category only shows when this feature is on. */
  feature?: string;
}

// Format using LOCAL calendar components. Using `toISOString()` on a Date built
// from local components shifts the day in positive-UTC zones (e.g. PKT, UTC+5),
// which would push report ranges a day off.
const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Default report window: year-to-date through today. This shows every
// transaction recorded so far in the current year (so payments/invoices are
// visible without changing the filter) and never runs past the current date —
// matching the QuickBooks "This Year-to-date" default.
export const getDefaultReportRange = (): ReportDateRange => {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
};

export const getComparisonRange = (range: ReportDateRange): ReportDateRange => {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);

  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
  const comparisonEnd = new Date(start);
  comparisonEnd.setDate(comparisonEnd.getDate() - 1);

  const comparisonStart = new Date(comparisonEnd);
  comparisonStart.setDate(comparisonStart.getDate() - (days - 1));

  return {
    startDate: toIsoDate(comparisonStart),
    endDate: toIsoDate(comparisonEnd),
  };
};

export const withinRange = (date: string, range: ReportDateRange): boolean => {
  const t = new Date(date).getTime();
  const start = new Date(range.startDate).getTime();
  const end = new Date(range.endDate + 'T23:59:59.999Z').getTime();
  return t >= start && t <= end;
};

export const asOf = (date: string, asOfDate: string): boolean => {
  const t = new Date(date).getTime();
  const end = new Date(asOfDate + 'T23:59:59.999Z').getTime();
  return t <= end;
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const getYtdRange = (): ReportDateRange => {
  const today = new Date();
  return { startDate: `${today.getFullYear()}-01-01`, endDate: `${today.getFullYear()}-12-31` };
};

export const getLastNDaysRange = (n: number): ReportDateRange => {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end.getTime() - (n - 1) * 86400000);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};
