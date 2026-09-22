// ═══════════════════════════════════════════════════════
// FinMatrix — AP Aging Report Network (Production API)
// ═══════════════════════════════════════════════════════
// The endpoint has existed since the reports module was written; nothing in
// the app ever called it, so there was no payables counterpart to A/R Aging.

import { fetchReport, fetchReportWithStatus } from './reportHelpers';

/**
 * Open payables, bucketed by how overdue they are. Same params and the same
 * missing `asOfDate` as the receivables side — see arAgingNetwork.
 */
export const getAPAgingAPI = async (
  params: Record<string, string> = {},
): Promise<any> => fetchReport('/reports/ap-aging', params);

export const getAPAgingReportAPI = getAPAgingAPI;

/** The open bills behind one vendor's aging row. See the A/R twin. */
export const getAPAgingPartyDocumentsAPI = async (
  vendorId: string,
  params: Record<string, string> = {},
): Promise<any> =>
  fetchReportWithStatus(
    `/reports/ap-aging/vendors/${encodeURIComponent(vendorId)}/documents`,
    params,
  );
