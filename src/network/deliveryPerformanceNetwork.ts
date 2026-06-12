// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Performance Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getDeliveryPerformanceAPI = async (params: any = {}): Promise<any> => {
  const query = typeof params === 'string' ? { date: params } : (params ?? {});
  return fetchReport('/reports/delivery-performance', query);
};
