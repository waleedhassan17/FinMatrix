// ═══════════════════════════════════════════════════════
// FinMatrix — Trial Balance Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getTrialBalanceAPI = async (paramsOrDate: string | { asOfDate?: string } = {}): Promise<any> => {
  const params = typeof paramsOrDate === 'string' ? { asOfDate: paramsOrDate } : paramsOrDate;
  return fetchReport('/reports/trial-balance', params);
};
export const getTrialBalanceReportAPI = getTrialBalanceAPI;
