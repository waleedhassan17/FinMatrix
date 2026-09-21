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
    // `entries` first. The server briefly returned these under `data`, which
    // the response envelope then lifted into its own slot and discarded every
    // sibling of — so the client received a bare array and rendered "no
    // transactions" for every account. Both orderings are accepted, and an
    // array is tolerated outright, so that shape can never blank the screen
    // again.
    entries: (Array.isArray(raw) ? raw : raw.entries ?? raw.data ?? []).map((e: any) => ({
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
      documentNumber: e.documentNumber ?? e.reference ?? '',
      counterpartyName: e.counterpartyName ?? '',
    })),
    total: n(raw.total),
    page: n(raw.page) || 1,
    limit: n(raw.limit) || 50,
  };
};
