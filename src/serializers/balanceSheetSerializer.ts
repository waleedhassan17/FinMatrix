import type {
  BalanceSheetLine,
  BalanceSheetReport,
  BalanceSheetReportResponse,
  BalanceSheetSectionLine,
  RetainedEarningsRollforward,
} from '../models/balanceSheetModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { arr, bool, num, numOrNull, str, strOrNull } from './reportValues';

const SYNTHETIC = ['retainedEarnings', 'currentYearEarnings'] as const;

const lineFrom = (l: any): BalanceSheetLine => ({
  accountId: str(l?.accountId),
  accountCode: str(l?.accountCode),
  accountName: str(l?.accountName),
  amount: num(l?.amount),
  synthetic: SYNTHETIC.includes(l?.synthetic) ? l.synthetic : null,
  composite:
    l?.composite && typeof l.composite === 'object'
      ? { postedBalance: num(l.composite.postedBalance), priorYearsEarnings: num(l.composite.priorYearsEarnings) }
      : null,
});

const sectionLineFrom = (l: any): BalanceSheetSectionLine => ({
  ...lineFrom(l),
  subType: strOrNull(l?.subType),
  priorAmount: numOrNull(l?.priorAmount),
  change: numOrNull(l?.change),
  changePct: numOrNull(l?.changePct),
  pctOfTotalAssets: numOrNull(l?.pctOfTotalAssets),
});

/**
 * GET /reports/balance-sheet. Numbers are coerced and every v2 field defaults,
 * so a server from before sections renders the flat lists it sends.
 */
export const balanceSheetSerializer = (payload: BalanceSheetReportResponse | unknown): BalanceSheetReport | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    asOfDate: str(raw.asOfDate),
    assets: arr(raw.assets).map(lineFrom),
    liabilities: arr(raw.liabilities).map(lineFrom),
    equity: arr(raw.equity).map(lineFrom),
    totalAssets: num(raw.totalAssets),
    totalLiabilities: num(raw.totalLiabilities),
    totalEquity: num(raw.totalEquity),
    isBalanced: bool(raw.isBalanced),
    fiscalYearStart: strOrNull(raw.fiscalYearStart),
    totalLiabilitiesAndEquity: numOrNull(raw.totalLiabilitiesAndEquity),
    gap: numOrNull(raw.gap),
    sections: arr(raw.sections).map((s: any) => ({
      key: str(s?.key),
      label: str(s?.label),
      lines: arr(s?.lines).map(sectionLineFrom),
      subtotal: num(s?.subtotal),
      priorSubtotal: numOrNull(s?.priorSubtotal),
      change: numOrNull(s?.change),
      changePct: numOrNull(s?.changePct),
      subtotalPctOfTotalAssets: numOrNull(s?.subtotalPctOfTotalAssets),
    })),
    subtotals: arr(raw.subtotals).map((t: any) => ({
      key: str(t?.key),
      label: str(t?.label),
      amount: num(t?.amount),
      priorAmount: numOrNull(t?.priorAmount),
      change: numOrNull(t?.change),
      changePct: numOrNull(t?.changePct),
      pctOfTotalAssets: numOrNull(t?.pctOfTotalAssets),
    })),
    comparison:
      raw.comparison && typeof raw.comparison === 'object'
        ? {
            asOfDate: str(raw.comparison.asOfDate),
            totalAssets: num(raw.comparison.totalAssets),
            totalLiabilities: num(raw.comparison.totalLiabilities),
            totalEquity: num(raw.comparison.totalEquity),
          }
        : null,
  };
};

/** GET /reports/balance-sheet/retained-earnings. */
export const retainedEarningsSerializer = (payload: unknown): RetainedEarningsRollforward | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    fiscalYearStart: str(raw.fiscalYearStart),
    postedTo3100: num(raw.postedTo3100),
    byFiscalYear: arr(raw.byFiscalYear).map((y: any) => ({
      fiscalYear: str(y?.fiscalYear),
      startDate: str(y?.startDate),
      endDate: str(y?.endDate),
      netIncome: num(y?.netIncome),
    })),
    total: num(raw.total),
  };
};
