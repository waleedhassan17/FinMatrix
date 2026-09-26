// Cut the network chain at its root: the slice reaches its network module and
// serializer, both of which land on apiHelpers → axios, expo-constants and
// AsyncStorage, none of which a reducer test needs.
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { inventoryItemReportSlice } from '../InventoryItemReport/inventoryItemReportSlice';
import type { ItemSalesEntries, ItemPerformance } from '../../../models/inventoryValuationModel';

/**
 * The item explorer's slice holds four requests. What keeps it honest:
 *
 *   • a slow answer for the previous window never lands on the current one;
 *   • the documents behind a month accumulate page by page, and a new month
 *     starts over;
 *   • a 404 is an answer — a missing item, or a server from before the
 *     documents endpoint — never a failure to retry.
 */
describe('item explorer slice', () => {
  const { fetchItemPerformance, fetchItemSalesEntries, clearItemSalesEntries } =
    inventoryItemReportSlice.actions;
  const reduce = inventoryItemReportSlice.reducer;
  const base = inventoryItemReportSlice.getInitialState();
  const range = { startDate: '2026-07-01', endDate: '2026-07-31' };

  const perf = (revenue: number): ItemPerformance => ({
    itemId: 'i1',
    itemName: 'Oil',
    sku: 'O',
    range,
    points: [],
    totals: { unitsSold: 1, revenue, cogs: 0, grossProfit: revenue, marginPct: 100 },
    costHistoryFrom: null,
    estimatedCogsShare: 0,
    item: null,
    customers: [],
    otherCustomers: { count: 0, unitsSold: 0, revenue: 0, grossProfit: 0 },
  });

  const page = (n: number, ids: string[], total: number): ItemSalesEntries => ({
    itemId: 'i1',
    range,
    entries: ids.map(id => ({
      date: '2026-07-24',
      docType: 'invoice',
      docId: id,
      docNumber: id,
      customerId: null as string | null,
      customerName: '(no customer)',
      units: 1,
      unitPrice: 10,
      revenue: 10,
      cogs: 6,
      grossProfit: 4,
      marginPct: 40,
      costBasis: 'posted',
      costKnown: true,
    })),
    total,
    page: n,
    limit: 25,
    totals: { unitsSold: total, revenue: total * 10, cogs: total * 6, grossProfit: total * 4 },
  });

  const arg = { itemId: 'i1', range };

  it('lets only the latest request write the sales', () => {
    let s = reduce(base, fetchItemPerformance.pending('old', arg));
    s = reduce(s, fetchItemPerformance.pending('new', arg));
    s = reduce(s, fetchItemPerformance.fulfilled(perf(999), 'old', arg));
    expect(s.performance).toBeNull();
    s = reduce(s, fetchItemPerformance.fulfilled(perf(100), 'new', arg));
    expect(s.performance?.totals.revenue).toBe(100);
  });

  it('reads a 404 on the item as not found, not as a failure to retry', () => {
    let s = reduce(base, fetchItemPerformance.pending('r1', arg));
    s = reduce(
      s,
      fetchItemPerformance.rejected(null, 'r1', arg, { message: 'Not found', status: 404 }),
    );
    expect(s.notFound).toBe(true);
    expect(s.perfStatus).toBe('failed');
  });

  it('accumulates a month page by page, and starts a new month over', () => {
    const a1 = { ...arg, page: 1 };
    const a2 = { ...arg, page: 2 };
    let s = reduce(base, fetchItemSalesEntries.pending('p1', a1));
    s = reduce(s, fetchItemSalesEntries.fulfilled(page(1, ['a', 'b'], 3), 'p1', a1));
    s = reduce(s, fetchItemSalesEntries.pending('p2', a2));
    // Loading more keeps what is on screen.
    expect(s.entries?.entries).toHaveLength(2);
    expect(s.entriesLoadingMore).toBe(true);
    s = reduce(s, fetchItemSalesEntries.fulfilled(page(2, ['c'], 3), 'p2', a2));
    expect(s.entries?.entries.map(e => e.docId)).toEqual(['a', 'b', 'c']);
    expect(s.entries?.totals.revenue).toBe(30);

    s = reduce(s, fetchItemSalesEntries.pending('p3', a1));
    expect(s.entries).toBeNull();
    expect(s.entriesStatus).toBe('loading');
  });

  it('says a server without the documents endpoint does not have them', () => {
    const a1 = { ...arg, page: 1 };
    let s = reduce(base, fetchItemSalesEntries.pending('p1', a1));
    s = reduce(s, fetchItemSalesEntries.rejected(null, 'p1', a1, { message: 'Not found', status: 404 }));
    expect(s.entriesStatus).toBe('unavailable');
    s = reduce(s, clearItemSalesEntries());
    expect(s.entriesStatus).toBe('idle');
  });
});
