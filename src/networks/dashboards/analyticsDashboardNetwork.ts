// ═══════════════════════════════════════════════════════
// FinMatrix — Analytics Dashboard Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from '../reports/reportHelpers';

// Removed: getDashboardSummaryAPI, which called /reports/profit-loss with
// `params = {}` — a dateless P&L. Nothing referenced it, and every real report
// caller sends a range from getDefaultReportRange, so it was a footgun waiting
// for someone to wire it up rather than a working entry point.

// The notification calls that used to sit here now live in
// networks/notifications/notificationsNetwork.ts, next to the screen that uses
// them.

export const getAnalyticsDashboardAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/analytics-dashboard', params);
};
