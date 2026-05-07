// ═══════════════════════════════════════════════════════
// FinMatrix — Sales by Customer Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getSalesByCustomerAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/sales-by-customer', params);
};
