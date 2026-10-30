import type { ApiEnvelope } from './reportModel';

/**
 * The balance sheet's sections, grouped on the SERVER (classifyForStatement:
 * the account's subtype first, its number only when the subtype says nothing).
 * The app used to group by account-number range, a guess about a chart the
 * user can edit; it no longer groups anything.
 */
export type StatementGroupKey =
  | 'cashAndBank'
  | 'receivables'
  | 'inventory'
  | 'otherCurrentAssets'
  | 'fixedAssets'
  | 'currentLiabilities'
  | 'longTermLiabilities'
  | 'equity';

export interface BalanceSheetLine {
  accountId: string;
  /** '' on a synthetic line — never a real account's code. */
  accountCode: string;
  accountName: string;
  amount: number;
  /**
   * A derived equity line that is not an account: 'retainedEarnings' when the
   * chart has no Retained Earnings account, 'currentYearEarnings' for the net
   * income from the fiscal year's start to the as-of date.
   */
  synthetic: 'retainedEarnings' | 'currentYearEarnings' | null;
  /** On the Retained Earnings account's line: its posted balance and the earlier years' earnings in it. */
  composite: { postedBalance: number; priorYearsEarnings: number } | null;
}

export interface BalanceSheetSectionLine extends BalanceSheetLine {
  subType: string | null;
  /** Null without a comparison date. */
  priorAmount: number | null;
  change: number | null;
  /** Null without a comparison, and when the prior amount is zero. */
  changePct: number | null;
  /** Null when total assets are zero. */
  pctOfTotalAssets: number | null;
}

export interface BalanceSheetSection {
  key: StatementGroupKey | string;
  label: string;
  lines: BalanceSheetSectionLine[];
  subtotal: number;
  priorSubtotal: number | null;
  change: number | null;
  changePct: number | null;
  subtotalPctOfTotalAssets: number | null;
}

export type BalanceSheetSubtotalKey =
  | 'totalCurrentAssets'
  | 'totalAssets'
  | 'totalCurrentLiabilities'
  | 'totalLiabilities'
  | 'totalEquity'
  | 'totalLiabilitiesAndEquity';

export interface BalanceSheetSubtotal {
  key: BalanceSheetSubtotalKey | string;
  label: string;
  amount: number;
  priorAmount: number | null;
  change: number | null;
  changePct: number | null;
  pctOfTotalAssets: number | null;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  // ── v2 (null / empty from a server that predates them) ──
  /** First day of the fiscal year the as-of date falls in — the server's. */
  fiscalYearStart: string | null;
  totalLiabilitiesAndEquity: number | null;
  /** Assets − (Liabilities + Equity), raw then rounded. */
  gap: number | null;
  sections: BalanceSheetSection[];
  subtotals: BalanceSheetSubtotal[];
  comparison: {
    asOfDate: string;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  } | null;
}

export type BalanceSheetReportResponse = ApiEnvelope<BalanceSheetReport>;

/** GET /reports/balance-sheet/retained-earnings — how the RE line was built. */
export interface RetainedEarningsRollforward {
  fiscalYearStart: string;
  /** What has been posted to account 3100 itself — closing entries, adjustments. */
  postedTo3100: number;
  /** Each earlier fiscal year's net income, oldest first. */
  byFiscalYear: { fiscalYear: string; startDate: string; endDate: string; netIncome: number }[];
  /** Equals the balance sheet's Retained Earnings line. */
  total: number;
}

// ─── Presentation ──────────────────────────────────────────────────────────

export type BalanceSheetMode = 'balance' | 'compare' | 'common';

export type BsRow =
  | { kind: 'groupHeading'; key: string; label: string }
  | { kind: 'line'; key: string; line: BalanceSheetSectionLine; depth: number }
  | {
      kind: 'total';
      key: string;
      label: string;
      amount: number;
      prior: number | null;
      changePct: number | null;
      pct: number | null;
      /** TOTAL ASSETS, TOTAL LIABILITIES AND EQUITY. */
      grand: boolean;
    }
  | { kind: 'empty'; key: string; label: string };

export interface BsDisplaySection {
  key: string;
  title: string;
  data: BsRow[];
}

/**
 * How the server's groups sit under the five headings a phone shows, and
 * which of the server's subtotals close each. This places groups the server
 * already made; it decides nothing about an account.
 */
const LAYOUT: {
  key: string;
  title: string;
  groups: StatementGroupKey[];
  /** Show each group's own subtotal ("Total Cash and Bank") under it. */
  groupTotals: boolean;
  closing: BalanceSheetSubtotalKey[];
}[] = [
  {
    key: 'currentAssets',
    title: 'Current Assets',
    groups: ['cashAndBank', 'receivables', 'inventory', 'otherCurrentAssets'],
    groupTotals: true,
    closing: ['totalCurrentAssets'],
  },
  { key: 'fixedAssets', title: 'Fixed Assets', groups: ['fixedAssets'], groupTotals: true, closing: ['totalAssets'] },
  {
    key: 'currentLiabilities',
    title: 'Current Liabilities',
    groups: ['currentLiabilities'],
    groupTotals: false,
    closing: ['totalCurrentLiabilities'],
  },
  {
    key: 'longTermLiabilities',
    title: 'Long-term Liabilities',
    groups: ['longTermLiabilities'],
    groupTotals: true,
    closing: ['totalLiabilities'],
  },
  { key: 'equity', title: 'Equity', groups: ['equity'], groupTotals: false, closing: ['totalEquity', 'totalLiabilitiesAndEquity'] },
];

const GRAND = new Set(['totalAssets', 'totalLiabilitiesAndEquity']);

const lineKey = (l: BalanceSheetLine, i: number) => `${l.accountCode || l.synthetic || 'line'}-${i}`;

const asSectionLine = (l: BalanceSheetLine): BalanceSheetSectionLine => ({
  ...l,
  subType: null,
  priorAmount: null,
  change: null,
  changePct: null,
  pctOfTotalAssets: null,
});

/**
 * The statement as SectionList sections: a sticky heading per block, then the
 * lines and the server's subtotals in statement order. Nothing is added up.
 *
 * A server that predates sections still renders — its three flat lists, under
 * Assets / Liabilities / Equity, each closed by the total it sent.
 */
export const balanceSheetSections = (report: BalanceSheetReport): BsDisplaySection[] => {
  if (report.sections.length === 0) {
    const flat = (key: string, title: string, lines: BalanceSheetLine[], total: number, totalLabel: string) => ({
      key,
      title,
      data: [
        ...(lines.length
          ? lines.map((l, i): BsRow => ({ kind: 'line', key: `${key}-${lineKey(l, i)}`, line: asSectionLine(l), depth: 0 }))
          : [{ kind: 'empty', key: `${key}-empty`, label: 'No accounts' } as BsRow]),
        { kind: 'total', key: `${key}-total`, label: totalLabel, amount: total, prior: null, changePct: null, pct: null, grand: key === 'assets' } as BsRow,
      ],
    });
    const out = [
      flat('assets', 'Assets', report.assets, report.totalAssets, 'TOTAL ASSETS'),
      flat('liabilities', 'Liabilities', report.liabilities, report.totalLiabilities, 'Total Liabilities'),
      flat('equity', 'Equity', report.equity, report.totalEquity, 'Total Equity'),
    ];
    if (report.totalLiabilitiesAndEquity !== null) {
      out[2].data.push({
        kind: 'total',
        key: 'equity-tle',
        label: 'TOTAL LIABILITIES AND EQUITY',
        amount: report.totalLiabilitiesAndEquity,
        prior: null,
        changePct: null,
        pct: null,
        grand: true,
      });
    }
    return out;
  }

  const sections = new Map(report.sections.map(s => [s.key, s]));
  const subtotals = new Map(report.subtotals.map(s => [s.key, s]));

  return LAYOUT.map(block => {
    const data: BsRow[] = [];
    const present = block.groups.map(g => sections.get(g)).filter((s): s is BalanceSheetSection => !!s && s.lines.length > 0);
    // A heading per group only where the block holds more than one kind.
    const headed = block.groups.length > 1;
    for (const s of present) {
      if (headed) data.push({ kind: 'groupHeading', key: `${s.key}-h`, label: s.label });
      s.lines.forEach((l, i) => data.push({ kind: 'line', key: `${s.key}-${lineKey(l, i)}`, line: l, depth: headed ? 1 : 0 }));
      if (block.groupTotals) {
        data.push({
          kind: 'total',
          key: `${s.key}-t`,
          label: `Total ${s.label}`,
          amount: s.subtotal,
          prior: s.priorSubtotal,
          changePct: s.changePct,
          pct: s.subtotalPctOfTotalAssets,
          grand: false,
        });
      }
    }
    if (present.length === 0) data.push({ kind: 'empty', key: `${block.key}-empty`, label: 'None' });
    for (const key of block.closing) {
      const t = subtotals.get(key);
      if (!t) continue;
      data.push({
        kind: 'total',
        key: `${block.key}-${key}`,
        label: t.label,
        amount: t.amount,
        prior: t.priorAmount,
        changePct: t.changePct,
        pct: t.pctOfTotalAssets,
        grand: GRAND.has(key),
      });
    }
    return { key: block.key, title: block.title, data };
  });
};

/** A change as the statement prints it: "+12.5%", "−3.0%", "new", or nothing. */
export const formatChangePct = (line: Pick<BalanceSheetSectionLine, 'amount' | 'priorAmount' | 'changePct'>): string => {
  if (line.priorAmount === null) return '';
  if (line.changePct !== null) {
    const v = line.changePct;
    return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
  }
  // Null with a prior of zero: there is no percentage of nothing.
  return line.priorAmount === 0 && line.amount !== 0 ? 'new' : '';
};

export const formatPct = (v: number | null): string => (v === null ? '—' : `${v.toFixed(1)}%`);
