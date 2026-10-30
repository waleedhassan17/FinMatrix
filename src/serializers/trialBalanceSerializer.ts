import type {
  TbPairs,
  TrialBalanceMode,
  TrialBalanceReport,
  TrialBalanceReportResponse,
} from '../models/trialBalanceModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { arr, bool, num, str, strOrNull } from './reportValues';

const MODES: TrialBalanceMode[] = ['closing', 'working', 'movement'];

/** The six working columns, when the object carries them. */
const pairsFrom = (o: any): TbPairs | null =>
  o && o.openingDebit !== undefined
    ? {
        openingDebit: num(o.openingDebit),
        openingCredit: num(o.openingCredit),
        periodDebit: num(o.periodDebit),
        periodCredit: num(o.periodCredit),
        closingDebit: num(o.closingDebit),
        closingCredit: num(o.closingCredit),
      }
    : null;

/**
 * GET /reports/trial-balance. Without `mode` the server answers exactly as it
 * did before v2 — rows of the period's debits and credits — and every v2
 * field here is then empty.
 */
export const trialBalanceSerializer = (
  payload: TrialBalanceReportResponse | unknown,
): TrialBalanceReport | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    range: { startDate: str(raw.range?.startDate), endDate: str(raw.range?.endDate) },
    rows: arr(raw.rows).map((r: any) => ({
      accountCode: str(r?.accountCode),
      accountName: str(r?.accountName),
      debit: num(r?.debit),
      credit: num(r?.credit),
      accountType: strOrNull(r?.accountType),
      subType: strOrNull(r?.subType),
      group: strOrNull(r?.group),
      flags: arr<string>(r?.flags).filter(f => typeof f === 'string'),
      synthetic: r?.synthetic === true,
      pairs: pairsFrom(r),
    })),
    totalDebits: num(raw.totalDebits),
    totalCredits: num(raw.totalCredits),
    isBalanced: bool(raw.isBalanced),
    mode: MODES.includes(raw.mode) ? raw.mode : null,
    asOfDate: strOrNull(raw.asOfDate),
    fiscalYearStart: strOrNull(raw.fiscalYearStart),
    groups: arr(raw.groups).map((g: any) => ({
      key: str(g?.key),
      label: str(g?.label),
      debit: num(g?.debit),
      credit: num(g?.credit),
      pairs: pairsFrom(g),
    })),
    totals: pairsFrom(raw.totals),
    balanced:
      raw.balanced && typeof raw.balanced === 'object'
        ? { opening: bool(raw.balanced.opening), period: bool(raw.balanced.period), closing: bool(raw.balanced.closing) }
        : null,
    // One warning was briefly a string; both read.
    warnings: [
      ...arr(raw.warnings).map((w: any) =>
        typeof w === 'string' ? { code: '', message: w } : { code: str(w?.code), message: str(w?.message) },
      ),
      ...(typeof raw.warning === 'string' && raw.warning ? [{ code: '', message: raw.warning }] : []),
    ].filter(w => w.message),
  };
};
