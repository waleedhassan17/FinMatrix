// ═══════════════════════════════════════════════════════
// FinMatrix — What stands out (analytics insights)
// ═══════════════════════════════════════════════════════
// The sentences are the server's (business-insights.ts), built from the same
// figures as the cards beside them, so the app and the website say the same
// thing in the same words. All this file decides is where each one leads.

import type { ReportDateRange } from './reportModel';

export type InsightTone = 'negative' | 'warning' | 'positive' | 'neutral';

export interface BusinessInsight {
  key: string;
  tone: InsightTone;
  title: string;
  detail: string;
  /** The report that explains it, by the server's key, with its query. */
  report: { key: string; params: Record<string, string> };
}

/** What the link to each report says — the report's own name, as on the website. */
export const INSIGHT_REPORT_LABEL: Record<string, string> = {
  profitLoss: 'Profit & Loss',
  balanceSheet: 'Balance Sheet',
  cashFlow: 'Cash Flow',
  arAging: 'AR Aging',
  apAging: 'AP Aging',
  inventoryValuation: 'Inventory Valuation',
  budgets: 'Budget',
};

/** The tone in words, for a screen reader — never colour alone. */
export const INSIGHT_TONE_LABEL: Record<InsightTone, string> = {
  negative: 'Needs attention',
  warning: 'Worth watching',
  positive: 'Going well',
  neutral: 'For information',
};

/** A screen to open for an insight, with its params; null for a report the app does not have. */
export type InsightTarget = { screen: string; params?: Record<string, unknown> } | null;

export const insightTarget = (report: BusinessInsight['report'], fallback: ReportDateRange): InsightTarget => {
  const { startDate, endDate, asOfDate, budgetId } = report.params;
  const range = startDate && endDate ? { startDate, endDate } : fallback;
  switch (report.key) {
    case 'profitLoss':
      return { screen: 'ProfitLoss', params: { range } };
    case 'cashFlow':
      return { screen: 'CashFlow', params: { range } };
    case 'balanceSheet':
      return { screen: 'BalanceSheet', params: { asOfDate: asOfDate ?? endDate ?? fallback.endDate } };
    case 'arAging':
      return { screen: 'ARAging' };
    case 'apAging':
      return { screen: 'APAging' };
    case 'inventoryValuation':
      return { screen: 'InventoryValuation' };
    case 'budgets':
      return budgetId ? { screen: 'BudgetDetail', params: { budgetId } } : null;
    default:
      return null;
  }
};
