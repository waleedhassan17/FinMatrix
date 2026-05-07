// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './_reportHelpers';

export const getInventoryValuationAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/inventory-valuation', params);
};
export const getInventoryValuationReportAPI = getInventoryValuationAPI;
