// ═══════════════════════════════════════════════════════
// FinMatrix — Profit & Loss Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './reportHelpers';

export const getProfitLossAPI = async (params: { startDate?: string; endDate?: string } = {}, comparisonParams?: any): Promise<any> => {
  const combined = comparisonParams ? { ...params, comparison: comparisonParams } : params;
  return fetchReport('/reports/profit-loss', combined);
};
export const getProfitLossReportAPI = getProfitLossAPI;

/**
 * The posted transactions behind one statement line.
 *
 * `accountCode` is the account NUMBER off the line ('4000'), not its id — the
 * P&L aggregates by account number and that is the only handle the line
 * carries. Paginated: a year of Sales Revenue is every invoice the company has
 * issued.
 */
export const getStatementLineEntriesAPI = async (
  accountCode: string,
  params: { startDate?: string; endDate?: string; page?: number; limit?: number } = {},
): Promise<any> =>
  fetchReport(
    `/reports/profit-loss/lines/${encodeURIComponent(accountCode)}/entries`,
    params,
  );
