import type {
  ProfitLossReport,
  ProfitLossReportResponse,
  StatementLineEntries,
  StatementLineEntriesResponse,
} from '../models/profitLossModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';

export const profitLossSerializer = (
  payload: ProfitLossReportResponse,
): ProfitLossReport | null => unwrapEnvelope<ProfitLossReport>(payload);

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

/**
 * The transactions behind one statement line.
 *
 * Amounts are coerced for the usual reason — the ledger columns are Postgres
 * `numeric` and an unwrapped one arrives as a string — and every collection
 * defaults, so an account with no activity in the period renders an empty list
 * rather than throwing inside the row that opened it.
 */
export const statementLineEntriesSerializer = (
  payload: StatementLineEntriesResponse,
): StatementLineEntries | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;
  return {
    accountCode: raw.accountCode ?? '',
    accountName: raw.accountName ?? '',
    accountType: raw.accountType ?? '',
    range: raw.range ?? { startDate: '', endDate: '' },
    lineAmount: n(raw.lineAmount),
    entries: (raw.data ?? raw.entries ?? []).map((e: any) => ({
      id: e.id ?? '',
      date: e.date ?? '',
      reference: e.reference ?? '',
      memo: e.memo ?? '',
      debit: n(e.debit),
      credit: n(e.credit),
      amount: n(e.amount),
      sourceType: e.sourceType ?? '',
      sourceId: e.sourceId ?? '',
      sourceLabel: e.sourceLabel ?? 'Journal entry',
    })),
    total: n(raw.total),
    page: n(raw.page) || 1,
    limit: n(raw.limit) || 50,
  };
};
