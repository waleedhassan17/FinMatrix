import type {
  ProfitLossReport,
  ProfitLossReportResponse,
  StatementLineEntry,
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
 * One posted ledger row, as every drill endpoint returns it — the P&L line,
 * the account register, the cash-flow line. They share the server's document
 * joins, so they share this.
 */
export const lineEntryFrom = (e: any): StatementLineEntry => ({
  id: e?.id ?? '',
  date: e?.date ?? '',
  reference: e?.reference ?? '',
  memo: e?.memo ?? '',
  debit: n(e?.debit),
  credit: n(e?.credit),
  amount: n(e?.amount),
  sourceType: e?.sourceType ?? '',
  sourceId: e?.sourceId ?? '',
  sourceLabel: e?.sourceLabel ?? 'Journal entry',
  documentNumber: e?.documentNumber ?? e?.reference ?? '',
  counterpartyName: e?.counterpartyName ?? '',
});
