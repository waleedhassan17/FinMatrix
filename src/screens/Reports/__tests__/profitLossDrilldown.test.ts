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

/**
 * The P&L keeps which lines are open; the postings under them live in the
 * shared drill cache (inlineEntries.test.ts), keyed by account and period.
 * What stays here: lines open independently, and a new period collapses them.
 */
describe('profitLoss drill-down', () => {
  const { toggleProfitLossLine, fetchProfitLossReport } = profitLossSlice.actions;
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

  it('collapses every open line when a new period loads', () => {
    let s = reduce(base, toggleProfitLossLine('4000'));
    s = reduce(
      s,
      fetchProfitLossReport.fulfilled({ revenue: 5 } as any, 'r2', {
        range: { startDate: '2026-04-01', endDate: '2026-06-30' },
        comparisonEnabled: false,
      }),
    );
    expect(s.expanded).toEqual({});
  });
});
