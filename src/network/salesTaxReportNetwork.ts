// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Tax Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getSalesTaxReportAPI = async (params: { startDate?: string; endDate?: string } = {}): Promise<any> => {
  return fetchReport('/reports/tax-report', params);
};
