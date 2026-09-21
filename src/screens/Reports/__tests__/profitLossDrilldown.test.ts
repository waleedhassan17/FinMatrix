// Cut the network chain at its root, the same way reportRangeRefresh does:
// importing a report slice reaches its network module AND its serializer, both
// of which land on apiHelpers → axios, expo-constants and AsyncStorage, none of
// which a reducer test needs.
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { profitLossSlice } from '../ProfitLoss/profitLossSlice';
import type { StatementLineEntries } from '../../../models/profitLossModel';

/**
 * The P&L drill-down holds per-line fetch state in a map keyed by account code.
 * Two properties keep it honest:
 *
 *   • a line already fetched is not refetched when it is reopened;
 *   • changing the period throws the map away, so last period's transactions
 *     can never appear under this period's figure.
 *
 * The second is the one that would be invisible: the numbers would still be
 * right, and the rows underneath them would be from a different quarter.
 */
describe('profitLoss drill-down', () => {
  const { toggleProfitLossLine, fetchProfitLossLineEntries, fetchProfitLossReport } =
    profitLossSlice.actions;
  const reduce = profitLossSlice.reducer;
  const base = profitLossSlice.getInitialState();

  it('opens and closes one line without touching its neighbours', () => {
    let s = reduce(base, toggleProfitLossLine('4000'));
    expect(s.expanded['4000']).toBe(true);

    s = reduce(s, toggleProfitLossLine('6000'));
    expect(s.expanded['4000']).toBe(true);
    expect(s.expanded['6000']).toBe(true);

    s = reduce(s, toggleProfitLossLine('4000'));
    expect(s.expanded['4000']).toBe(false);
    expect(s.expanded['6000']).toBe(true);
  });

  it('records fetch state per account code', () => {
    const pending = fetchProfitLossLineEntries.pending('req-1', {
      accountCode: '4000',
      range: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    let s = reduce(base, pending);
    expect(s.entries['4000'].status).toBe('loading');
    expect(s.entries['6000']).toBeUndefined();

    // Annotated, so a drift in the payload shape fails here rather than
    // silently in the screen that reads it.
    const payload: StatementLineEntries = {
      accountCode: '4000',
      accountName: 'Sales Revenue',
      accountType: 'revenue',
      range: { startDate: '2026-01-01', endDate: '2026-12-31' },
      lineAmount: 1200,
      entries: [],
      total: 0,
      page: 1,
      limit: 50,
    };
    s = reduce(
      s,
      fetchProfitLossLineEntries.fulfilled(payload as any, 'req-1', {
        accountCode: '4000',
        range: { startDate: '2026-01-01', endDate: '2026-12-31' },
      }),
    );
    expect(s.entries['4000'].status).toBe('succeeded');
    expect(s.entries['4000'].data?.lineAmount).toBe(1200);
  });

  it('keeps a failure on the line that failed, with its message', () => {
    const arg = { accountCode: '5000', range: { startDate: '2026-01-01', endDate: '2026-12-31' } };
    const s = reduce(
      base,
      fetchProfitLossLineEntries.rejected(new Error('Network unreachable'), 'r', arg),
    );
    expect(s.entries['5000'].status).toBe('failed');
    expect(s.entries['5000'].error).toBe('Network unreachable');
    expect(s.entries['5000'].data).toBeNull();
  });

  it('drops every cached line when a new period loads', () => {
    let s = reduce(base, toggleProfitLossLine('4000'));
    s = reduce(
      s,
      fetchProfitLossLineEntries.fulfilled({ entries: [] } as unknown as any, 'r', {
        accountCode: '4000',
        range: { startDate: '2026-01-01', endDate: '2026-03-31' },
      }),
    );
    expect(Object.keys(s.entries)).toHaveLength(1);

    // A different quarter arrives; the rows under the old figure are stale.
    s = reduce(
      s,
      fetchProfitLossReport.fulfilled({ revenue: 5 } as any, 'r2', {
        range: { startDate: '2026-04-01', endDate: '2026-06-30' },
        comparisonEnabled: false,
      }),
    );
    expect(s.entries).toEqual({});
    expect(s.expanded).toEqual({});
  });
});
