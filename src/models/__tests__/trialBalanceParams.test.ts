import { trialBalanceParams } from '../trialBalanceModel';

describe('trialBalanceParams', () => {
  it('sends only the as-of date for a closing trial balance', () => {
    // The hidden start date (2026-01-01) is later than the as-of date the
    // user picked: sending it would make the server refuse the range.
    expect(
      trialBalanceParams({ startDate: '2026-01-01', endDate: '2025-12-31', mode: 'closing' }),
    ).toEqual({ endDate: '2025-12-31', mode: 'closing' });
  });

  it('keeps the range for working and movement, which use both ends', () => {
    const range = { startDate: '2026-01-01', endDate: '2026-06-30' };
    expect(trialBalanceParams({ ...range, mode: 'working' })).toEqual({ ...range, mode: 'working' });
    expect(trialBalanceParams({ ...range, mode: 'movement' })).toEqual({ ...range, mode: 'movement' });
    expect(trialBalanceParams(range)).toEqual(range);
  });
});
