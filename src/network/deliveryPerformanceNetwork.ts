// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Performance Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getDeliveryPerformanceAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/delivery-performance', params);
};
