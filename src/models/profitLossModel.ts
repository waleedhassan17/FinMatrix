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
  /**
   * The document's own number — INV-2026-0001.
   *
   * This is what someone is looking for when they open an account. `reference`
   * is the journal-entry number (JE-005), which identifies the posting rather
   * than the record. Falls back to `reference` on a manual entry, which has no
   * document.
   */
  documentNumber: string;
  /** The customer or vendor. Empty on a manual journal entry. */
  counterpartyName: string;
}

