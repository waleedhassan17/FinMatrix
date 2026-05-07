// ═══════════════════════════════════════════════════════
// FinMatrix — Sales by Item Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getSalesByItemAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/sales-by-item', params);
};
