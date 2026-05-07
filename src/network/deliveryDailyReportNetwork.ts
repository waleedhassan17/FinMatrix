// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Daily Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getDeliveryDailyReportAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/delivery-daily', params);
};
