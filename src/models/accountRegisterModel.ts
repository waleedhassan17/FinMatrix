// ═══════════════════════════════════════════════════════
// FinMatrix — One account's register
// ═══════════════════════════════════════════════════════
// Every posting to one account over a period, oldest first, with the balance
// after each. The running balance is the SERVER's (a window sum over the
// whole ledger), so it is right on page five without the device having seen
// pages one to four — and the device never adds one up.

import type { ReportDateRange } from './reportModel';
import type { StatementLineEntry } from './profitLossModel';

export interface RegisterAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  subType: string;
}

export interface RegisterEntry extends StatementLineEntry {
  /** The account's balance after this row, signed by its normal balance. */
  runningBalance: number;
}

export interface AccountRegister {
  account: RegisterAccount;
  range: ReportDateRange;
  /**
   * 'cumulative' — a balance-sheet account carries everything before the
   * start date; 'fiscalYearToDate' — income and expense restart at the
   * fiscal year containing it.
   */
  openingBasis: 'cumulative' | 'fiscalYearToDate' | null;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  /**
   * The period's net movement signed the way the statement reads the account
   * — what a P&L line shows. Null on a server that does not send it; the app
   * does not derive it from the debit and credit columns.
   */
  periodNet: number | null;
  entries: RegisterEntry[];
  total: number;
  page: number;
  limit: number;
}

export type RegisterOrder = 'asc' | 'desc';

export interface RegisterState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string;
  /** Every page loaded so far. */
  data: AccountRegister | null;
  loadingMore?: boolean;
  /** The server answered 404 — the account (or the route) does not exist. */
  notFound?: boolean;
}

export const emptyRegisterState: RegisterState = { status: 'idle', error: '', data: null };

/**
 * One register per account AND period: two can sit in one navigation stack
 * (the balance sheet's, then the P&L's for the same account), and neither may
 * show the other's rows.
 */
export const registerKey = (accountCode: string, startDate: string, endDate: string): string =>
  `${accountCode}|${startDate}|${endDate}`;

export const hasMoreEntries = (r: AccountRegister | null): boolean =>
  !!r && r.entries.length < r.total;

/** One counterparty's or document type's part in a change between periods. */
export interface MovementRow {
  name: string;
  current: number;
  prior: number;
  change: number;
}

export interface AccountMovement {
  current: number;
  prior: number;
  change: number;
  /** Largest move first; an "Unattributed" row collects postings with no party. */
  byCounterparty: MovementRow[];
  bySourceType: MovementRow[];
}

export interface MovementState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string;
  data: AccountMovement | null;
}

export const movementKey = (
  accountCode: string,
  range: ReportDateRange,
  compare: ReportDateRange,
): string => `${registerKey(accountCode, range.startDate, range.endDate)}|${compare.startDate}|${compare.endDate}`;

/** What the "✓ ties to statement" check compares the register against. */
export interface RegisterTie {
  /** The figure on the statement line the register was opened from. */
  amount: number;
  /**
   * 'closing' — a balance (balance sheet, closing trial balance);
   * 'movement' — a period's activity (P&L line).
   */
  basis: 'closing' | 'movement';
}

/** A paisa either way is the rounding the server already did; more is a gap. */
export const TIE_TOLERANCE = 0.005;

/**
 * Whether the register agrees with the line it was opened from, or null when
 * there is nothing to compare — no tie asked for, or a movement tie against a
 * server that does not send `periodNet`.
 */
export const registerTies = (r: AccountRegister | null, tie: RegisterTie | undefined): boolean | null => {
  if (!r || !tie) return null;
  const figure = tie.basis === 'closing' ? r.closingBalance : r.periodNet;
  if (figure === null) return null;
  return Math.abs(figure - tie.amount) <= TIE_TOLERANCE;
};
