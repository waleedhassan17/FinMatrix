// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './reportHelpers';

export const getInventoryValuationAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/inventory-valuation', params);
};
export const getInventoryValuationReportAPI = getInventoryValuationAPI;

/**
 * Company-wide stock value, month by month, from GL account 1200.
 *
 * Exact and tied to the balance sheet at every point — no new data was needed
 * for this, the ledger has always recorded what inventory was worth.
 */
export const getInventoryValuationTrendAPI = async (
  months = 12,
): Promise<any> => fetchReport('/reports/inventory-valuation/trend', { months });

/**
 * One item's stock level month by month, from its movement history.
 *
 * Quantity is exact. Month-end VALUE is not returned yet: there is no cost on
 * a stock movement, and pricing a past quantity at the item's current
 * weighted-average cost would be retroactively wrong. The response says so in
 * its `coverage` block rather than returning a plausible zero.
 */
export const getInventoryItemHistoryAPI = async (
  itemId: string,
  months = 12,
): Promise<any> =>
  fetchReport(
    `/reports/inventory-valuation/items/${encodeURIComponent(itemId)}/history`,
    { months },
  );

/**
 * One item's sales and gross margin over a period.
 *
 * Revenue was always answerable; COST is what needed recording per line. Where
 * an invoice carried several different items, its total cost is exact but the
 * split between them is apportioned — `estimatedCogsShare` says how much of
 * the answer rests on that.
 */
export const getItemPerformanceAPI = async (
  itemId: string,
  range: { startDate: string; endDate: string },
): Promise<any> =>
  fetchReport(`/reports/item-performance/${encodeURIComponent(itemId)}`, range);
