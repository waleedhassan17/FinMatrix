// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation Report Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport, fetchReportWithStatus } from './reportHelpers';

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
 * One item's stock level and value month by month, from its movement history.
 *
 * Both walk back from today's quantity and value through the dated movements,
 * so the latest month is what the valuation list shows. Value is only claimed
 * from the company's cost-history date; `coverage` says where it stops.
 *
 * Given a range, the months match the ones item-performance returns for it —
 * the explorer puts the two side by side. A server that predates the range
 * ignores it and answers with the last `months`.
 */
export const getInventoryItemHistoryAPI = async (
  itemId: string,
  months = 12,
  range?: { startDate: string; endDate: string },
): Promise<any> =>
  fetchReportWithStatus(
    `/reports/inventory-valuation/items/${encodeURIComponent(itemId)}/history`,
    range ? { months, ...range } : { months },
  );

/**
 * The document lines behind one item's figures — invoices, deliveries and
 * returns — newest first, a page at a time. The status survives, so a server
 * from before the endpoint (404) reads as "not available" rather than as a
 * failure to retry.
 */
export const getItemSalesEntriesAPI = async (
  itemId: string,
  range: { startDate: string; endDate: string },
  page = 1,
  limit = 25,
): Promise<any> =>
  fetchReportWithStatus(
    `/reports/item-performance/${encodeURIComponent(itemId)}/entries`,
    { ...range, page, limit },
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
  fetchReportWithStatus(`/reports/item-performance/${encodeURIComponent(itemId)}`, range);

/**
 * Every item's sales, cost and margin for a period, beside its stock value.
 *
 * Every item comes back, unpaginated, so the screen ranks and filters the
 * whole list itself; `sort` only sets the order the server returns it in.
 */
export const getInventoryPerformanceAPI = async (
  range: { startDate: string; endDate: string },
  sort = 'grossProfit',
): Promise<any> =>
  fetchReport('/reports/inventory-performance', { ...range, sort });
