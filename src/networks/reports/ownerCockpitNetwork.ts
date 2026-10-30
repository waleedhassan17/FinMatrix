// ═══════════════════════════════════════════════════════
// FinMatrix — Owner Cockpit network (reports v2)
// ═══════════════════════════════════════════════════════

import { fetchReportWithStatus } from './reportHelpers';

/**
 * The owner's view of a period beside the one before it. The comparison
 * period is chosen by the server (the same whole months before, or the same
 * number of days), so no client decides what "last period" means.
 */
export const getOwnerCockpitAPI = async (params: {
  startDate: string;
  endDate: string;
  /** How many expense accounts and customers the server names before Other (3–10). */
  expenseTop?: number;
  customerTop?: number;
}): Promise<any> => fetchReportWithStatus('/reports/analytics', params);
