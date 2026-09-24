// The slice imports its network module, which reaches axios and AsyncStorage;
// a reducer test needs neither. Same cut as agingDrilldown.test.ts.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { generalLedgerSlice, refreshLedgerRange, setLedgerRange } from '../generalLedgerSlice';

const reduce = generalLedgerSlice.reducer;

/**
 * The ledger screen's focus effect is keyed on the range object. When a
 * refresh swapped in a new object with the same dates, the effect re-ran,
 * refreshed again, and the screen died with "Maximum update depth exceeded".
 */
describe('refreshLedgerRange', () => {
  it('keeps the same range object when the dates have not moved', () => {
    const once = reduce(undefined, refreshLedgerRange());
    const twice = reduce(once, refreshLedgerRange());
    expect(twice.range).toBe(once.range);
  });

  it('leaves a range the user chose alone', () => {
    const chosen = reduce(undefined, setLedgerRange({ startDate: '2025-01-01', endDate: '2025-03-31' }));
    const after = reduce(chosen, refreshLedgerRange());
    expect(after.range).toEqual({ startDate: '2025-01-01', endDate: '2025-03-31' });
  });
});
