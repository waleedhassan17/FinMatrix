import type { ApiEnvelope, ReportDateRange } from './reportModel';

/**
 * One account's contribution to a statement section, sign already applied by
 * the server.
 *
 * This lived on ProfitLossScreen as a local type while it was only a
 * presentation concern. The drill-down made it shared: the slice keys fetched
 * transactions by `accountCode`, so screen and store have to agree on it.
 */
export interface PnlLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

/**
 * Per-account detail and the operating / non-operating split.
 *
 * Every field is optional because a deployment that predates them returns only
 * the scalars, and the statement falls back to group rows when they are
 * absent.
 */
export interface PnlDetail {
  income?: PnlLine[];
  cogsLines?: PnlLine[];
  expenseLines?: PnlLine[];
  otherIncome?: PnlLine[];
  otherExpense?: PnlLine[];
  totalIncome?: number;
  totalCogs?: number;
  totalExpenses?: number;
  netOperatingIncome?: number;
  netOtherIncome?: number;
}

export interface ProfitLossReport extends PnlDetail {
  range: ReportDateRange;
  comparisonRange: ReportDateRange | null;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  comparison?: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netIncome: number;
  };
}

export type ProfitLossReportResponse = ApiEnvelope<ProfitLossReport>;

/** One posted ledger row behind a statement line. */
export interface StatementLineEntry {
  id: string;
  date: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  /**
   * Signed the way the statement reads this account, so the entries on a line
   * add up to the line. Revenue is credit-normal, expenses debit-normal.
   */
  amount: number;
  /** e.g. 'invoice' — what kind of document posted this. */
  sourceType: string;
  /** The document's id, for opening it. */
  sourceId: string;
  /** e.g. 'Invoice' — `sourceType` in words. */
  sourceLabel: string;
}

export interface StatementLineEntries {
  accountCode: string;
  accountName: string;
  accountType: string;
  range: ReportDateRange;
  /** The figure on the statement line, over the whole range. */
  lineAmount: number;
  entries: StatementLineEntry[];
  /** Rows in the range, which may exceed what one page returned. */
  total: number;
  page: number;
  limit: number;
}

export type StatementLineEntriesResponse = ApiEnvelope<StatementLineEntries>;

/** Helper types for one line's fetch state inside the slice. */
export interface LineEntriesState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string;
  data: StatementLineEntries | null;
}

export const emptyLineEntries: LineEntriesState = {
  status: 'idle',
  error: '',
  data: null,
};
