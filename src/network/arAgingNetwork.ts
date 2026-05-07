// ═══════════════════════════════════════════════════════
// FinMatrix — AR Aging Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getARAgingAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/ar-aging', params);
};
export const getARAgingReportAPI = getARAgingAPI;
