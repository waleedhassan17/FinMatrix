import type {
  CashFlowLine,
  CashFlowLineEntries,
  CashFlowReport,
  CashFlowReportResponse,
  CashFlowSection,
  CashFlowSectionKey,
} from '../models/cashFlowModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { lineEntryFrom } from './profitLossSerializer';
import { arr, bool, num, numOrNull, str, strOrNull } from './reportValues';

const SECTIONS: CashFlowSectionKey[] = ['operating', 'investing', 'financing'];
const sectionKey = (v: unknown): CashFlowSectionKey | null =>
  SECTIONS.includes(v as CashFlowSectionKey) ? (v as CashFlowSectionKey) : null;

const lineFrom = (l: any): CashFlowLine => ({
  label: str(l?.label),
  amount: num(l?.amount),
  lineKey: strOrNull(l?.lineKey),
  section: sectionKey(l?.section),
});

const sectionFrom = (s: any): CashFlowSection => ({
  lines: arr(s?.lines).map(lineFrom),
  total: num(s?.total),
});

/** GET /reports/cash-flow. Every v2 field defaults, so an older server still renders. */
export const cashFlowSerializer = (payload: CashFlowReportResponse | unknown): CashFlowReport | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  const ind = raw.operatingIndirect;
  return {
    range: { startDate: str(raw.range?.startDate), endDate: str(raw.range?.endDate) },
    operating: sectionFrom(raw.operating),
    investing: sectionFrom(raw.investing),
    financing: sectionFrom(raw.financing),
    netChange: num(raw.netChange),
    beginningCash: num(raw.beginningCash),
    endingCash: num(raw.endingCash),
    monthlyTrend: arr(raw.monthlyTrend).map((p: any) => ({
      label: str(p?.label),
      value: num(p?.value),
      endingCash: numOrNull(p?.endingCash),
    })),
    operatingIndirect:
      ind && typeof ind === 'object'
        ? {
            netIncome: num(ind.netIncome),
            adjustments: arr(ind.adjustments).map(lineFrom),
            total: num(ind.total),
            excludedNonCash: arr(ind.excludedNonCash).map(lineFrom),
          }
        : null,
    accounts: arr(raw.accounts).map((a: any) => ({
      accountCode: str(a?.accountCode),
      accountName: str(a?.accountName),
      beginning: num(a?.beginning),
      ending: num(a?.ending),
    })),
    cashTie:
      raw.cashTie && typeof raw.cashTie === 'object'
        ? {
            endingCash: num(raw.cashTie.endingCash),
            balanceSheetCash: num(raw.cashTie.balanceSheetCash),
            ties: bool(raw.cashTie.ties),
          }
        : null,
    monthly: arr(raw.monthly).map((m: any) => ({
      period: str(m?.period),
      label: str(m?.label),
      inflow: num(m?.inflow),
      outflow: num(m?.outflow),
      net: num(m?.net),
      endingCash: num(m?.endingCash),
    })),
  };
};

/** GET /reports/cash-flow/lines/:lineKey/entries. */
export const cashFlowLineEntriesSerializer = (payload: unknown): CashFlowLineEntries | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    lineKey: str(raw.lineKey),
    label: str(raw.label),
    section: sectionKey(raw.section),
    range: { startDate: str(raw.range?.startDate), endDate: str(raw.range?.endDate) },
    lineAmount: num(raw.lineAmount),
    entries: arr(raw.entries ?? raw.data).map((e: any) => {
      const base = lineEntryFrom(e);
      return {
        ...base,
        cashAccountCode: str(e?.cashAccountCode),
        cashAccountName: str(e?.cashAccountName),
        // A server that does not split reports the whole posting.
        allocatedAmount: e?.allocatedAmount === undefined ? base.amount : num(e.allocatedAmount),
        allocationPct: e?.allocationPct === undefined ? 100 : num(e.allocationPct),
      };
    }),
    total: num(raw.total),
    page: num(raw.page) || 1,
    limit: num(raw.limit) || 50,
  };
};
