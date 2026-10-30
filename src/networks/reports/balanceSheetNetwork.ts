// ═══════════════════════════════════════════════════════
// FinMatrix — Balance Sheet Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport, fetchReportWithStatus } from './reportHelpers';

/**
 * `compareTo` (reports v2) adds the prior figure, change and change % to every
 * line; it must be before `asOfDate`. Left out, the request is the one a
 * server from before v2 understands.
 */
export const getBalanceSheetAPI = async (
  paramsOrDate: string | { asOfDate?: string; compareTo?: string | null } = {},
): Promise<any> => {
  const params = typeof paramsOrDate === 'string' ? { asOfDate: paramsOrDate } : { ...paramsOrDate };
  if (!params.compareTo) delete params.compareTo;
  return fetchReport('/reports/balance-sheet', params);
};
export const getBalanceSheetReportAPI = getBalanceSheetAPI;

/** How the Retained Earnings line was built: posted to 3100, then each earlier year. */
export const getRetainedEarningsAPI = async (asOfDate: string): Promise<any> =>
  fetchReportWithStatus('/reports/balance-sheet/retained-earnings', { asOfDate });

/** Working capital, liquidity, leverage, DSO/DPO/DIO and runway at one date. */
export const getFinancialHealthAPI = async (asOfDate: string): Promise<any> =>
  fetchReportWithStatus('/reports/financial-health', { asOfDate });
