import type { ApiEnvelope, ReportDateRange } from './reportModel';

/**
 * closing — balances as of the end date: balance-sheet accounts since
 *   inception, income and expense for the fiscal year to date, plus one
 *   synthetic line for earlier years' earnings so it balances;
 * working — opening, the period's debits and credits, and closing, per row;
 * movement — the period's activity only (the server's default).
 */
export type TrialBalanceMode = 'closing' | 'working' | 'movement';

export interface TrialBalanceParams {
  startDate?: string;
  endDate?: string;
  mode?: TrialBalanceMode;
}

/**
 * The query a trial balance actually needs.
 *
 * A closing trial balance is AS OF `endDate`: a start date means nothing to
 * it. Sending the screen's hidden one anyway lets the server refuse any "as
 * of" date earlier than it (INVALID_RANGE) — a request the user could not
 * fix, because the From field is not shown in Closing mode. So it is left out.
 */
export const trialBalanceParams = (params: TrialBalanceParams): TrialBalanceParams =>
  params.mode === 'closing' ? { endDate: params.endDate, mode: params.mode } : params;

export const TB_MODES: { key: TrialBalanceMode; label: string }[] = [
  { key: 'closing', label: 'Closing' },
  { key: 'working', label: 'Working' },
  { key: 'movement', label: 'Movement' },
];

/** The working trial balance's six columns. */
export interface TbPairs {
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export type TbFlag = 'abnormal_balance' | 'contra_assumed' | 'obe_nonzero';

export interface TrialBalanceRow {
  /** '' on the synthetic prior-years' earnings line. */
  accountCode: string;
  accountName: string;
  /** The row's figure in the requested mode (in working mode, the closing pair). */
  debit: number;
  credit: number;
  accountType: string | null;
  subType: string | null;
  /** The server's group — a balance-sheet section key or a P&L group. */
  group: string | null;
  flags: string[];
  synthetic: boolean;
  /** Working mode only. */
  pairs: TbPairs | null;
}

export interface TrialBalanceGroup {
  key: string;
  label: string;
  debit: number;
  credit: number;
  pairs: TbPairs | null;
}

export interface TrialBalanceReport {
  range: ReportDateRange;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  // ── v2 (absent without an explicit mode, or from an older server) ──
  mode: TrialBalanceMode | null;
  asOfDate: string | null;
  fiscalYearStart: string | null;
  groups: TrialBalanceGroup[];
  /** Working mode: the six column totals. */
  totals: TbPairs | null;
  /** Working mode: whether each column pair balances, decided on raw figures. */
  balanced: { opening: boolean; period: boolean; closing: boolean } | null;
  warnings: { code: string; message: string }[];
}

export type TrialBalanceReportResponse = ApiEnvelope<TrialBalanceReport>;

// ─── Presentation ──────────────────────────────────────────────────────────

/** What each flag means, for the sheet a flag icon opens. */
export const TB_FLAG_TEXT: Record<TbFlag, { title: string; body: string }> = {
  abnormal_balance: {
    title: 'Balance on the unusual side',
    body:
      'This account is in credit where it would normally be in debit (an asset, an expense, owner drawings), ' +
      'or in debit where it would normally be in credit (a liability, equity, income). It is usually a posting ' +
      'to the wrong account, or a payment recorded before its bill or invoice.',
  },
  contra_assumed: {
    title: 'Treated as a contra-asset',
    body:
      'Its name says "Accumulated", so it is read as a contra-asset — accumulated depreciation, say — where a ' +
      'credit balance is expected. It is not flagged as unusual for that.',
  },
  obe_nonzero: {
    title: 'Opening Balance Equity is not zero',
    body:
      'Opening Balance Equity should be cleared once the opening position is fully entered. A balance here ' +
      'means part of the opening figures has not been moved to the accounts it belongs to.',
  },
};

export const flagText = (flag: string): { title: string; body: string } =>
  TB_FLAG_TEXT[flag as TbFlag] ?? { title: flag.replace(/_/g, ' '), body: 'Flagged by the server.' };

/** Which side a row's balance sits on: the side with a figure, or none. */
export const drCr = (debit: number, credit: number): { amount: number; side: 'Dr' | 'Cr' | null } =>
  debit > 0 ? { amount: debit, side: 'Dr' } : credit > 0 ? { amount: credit, side: 'Cr' } : { amount: 0, side: null };

export interface TbSection {
  key: string;
  title: string;
  /** The server's subtotal for the group; null when filtering or absent. */
  subtotal: TrialBalanceGroup | null;
  data: TrialBalanceRow[];
}

/**
 * Rows under the server's groups, in the server's order. A search or the
 * flagged filter narrows the rows; the group subtotal is then left off, since
 * it would total rows that are not shown. A response without groups (an
 * older server, no mode) is one plain list.
 */
export const trialBalanceSections = (
  report: TrialBalanceReport,
  opts: { flaggedOnly?: boolean; query?: string } = {},
): TbSection[] => {
  const q = (opts.query ?? '').trim().toLowerCase();
  const filtering = !!opts.flaggedOnly || q.length > 0;
  const keep = (r: TrialBalanceRow) =>
    (!opts.flaggedOnly || r.flags.length > 0) &&
    (!q || r.accountName.toLowerCase().includes(q) || r.accountCode.toLowerCase().includes(q));
  const rows = report.rows.filter(keep);

  if (report.groups.length === 0) {
    return rows.length ? [{ key: 'all', title: 'Accounts', subtotal: null, data: rows }] : [];
  }
  const known = new Set(report.groups.map(g => g.key));
  const out: TbSection[] = report.groups
    .map(g => ({
      key: g.key,
      title: g.label,
      subtotal: filtering ? null : g,
      data: rows.filter(r => r.group === g.key),
    }))
    .filter(s => s.data.length > 0);
  // A row in a group the server did not list still shows — never dropped.
  const stray = rows.filter(r => !r.group || !known.has(r.group));
  if (stray.length) out.push({ key: 'other', title: 'Other', subtotal: null, data: stray });
  return out;
};

export const flaggedCount = (report: TrialBalanceReport): number =>
  report.rows.filter(r => r.flags.length > 0).length;
