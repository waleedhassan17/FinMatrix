// ═══════════════════════════════════════════════════════
// FinMatrix — Cash Flow Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport, fetchReportWithStatus } from './reportHelpers';

export const getCashFlowAPI = async (
  params: { startDate?: string; endDate?: string } = {},
): Promise<any> => fetchReport('/reports/cash-flow', params);

export const getCashFlowReportAPI = getCashFlowAPI;

/**
 * The cash postings classified into one cash-flow line (reports v2). With
 * status: a 404 is a server from before the route, not a retry.
 */
export const getCashFlowLineEntriesAPI = async (
  lineKey: string,
  params: { startDate: string; endDate: string; page?: number; limit?: number },
): Promise<any> =>
  fetchReportWithStatus(`/reports/cash-flow/lines/${encodeURIComponent(lineKey)}/entries`, params);
