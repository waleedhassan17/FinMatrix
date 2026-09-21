// ═══════════════════════════════════════════════════════
// FinMatrix — AR Aging Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './reportHelpers';

/**
 * Open receivables, bucketed by how overdue they are.
 *
 * Params: `preset` ('days3' | 'weekly' | 'biweekly' | 'monthly' | 'custom')
 * and, for custom, `buckets` as ascending days ('3,6,9,12'). Sending neither
 * asks for the company's saved default, which is why the first load passes {}.
 *
 * There is no `asOfDate`. It was accepted and silently discarded for as long as
 * this endpoint has existed — the report has always aged against now — and the
 * screen offered a date picker that changed nothing. True as-of aging needs
 * each document's balance rebuilt from payment history, which `invoices.balance`
 * does not carry.
 */
export const getARAgingAPI = async (
  params: Record<string, string> = {},
): Promise<any> => fetchReport('/reports/ar-aging', params);

export const getARAgingReportAPI = getARAgingAPI;
