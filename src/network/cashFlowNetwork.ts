// ═══════════════════════════════════════════════════════
// FinMatrix — Cash Flow Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getCashFlowAPI = async (params: { startDate?: string; endDate?: string } = {}): Promise<any> => {
  return fetchReport('/reports/cash-flow', params);
};
export const getCashFlowReportAPI = getCashFlowAPI;
