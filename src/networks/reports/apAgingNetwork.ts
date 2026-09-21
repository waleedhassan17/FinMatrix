// ═══════════════════════════════════════════════════════
// FinMatrix — AP Aging Report Network (Production API)
// ═══════════════════════════════════════════════════════
// The endpoint has existed since the reports module was written; nothing in
// the app ever called it, so there was no payables counterpart to A/R Aging.

import { fetchReport } from './reportHelpers';

/**
 * Open payables, bucketed by how overdue they are. Same params and the same
 * missing `asOfDate` as the receivables side — see arAgingNetwork.
 */
export const getAPAgingAPI = async (
  params: Record<string, string> = {},
): Promise<any> => fetchReport('/reports/ap-aging', params);

export const getAPAgingReportAPI = getAPAgingAPI;
