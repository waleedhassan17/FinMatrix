// The slice keeps the day on screen honest: a slow answer for a day the user
// has already stepped away from never overwrites the day they are looking at.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  extractErrorMessage: (e: { message?: string }) => e?.message ?? 'error',
}));

import { daySummarySlice, fetchDaySummary, setDayDate, setDayFilter, setDayCreatedBy } from '../daySummarySlice';
import { daySummarySerializer } from '../../../../serializers/daySummarySerializer';
import { daySummaryOwner } from '../__fixtures__/daySummary';

const reducer = daySummarySlice.reducer;
const init = () => reducer(undefined, { type: '@@init' });

const fulfilled = (date: string, createdBy: string | null) => ({
  type: fetchDaySummary.fulfilled.type,
  payload: daySummarySerializer({ ...daySummaryOwner, date }),
  meta: { arg: { date, createdBy }, requestId: 'r', requestStatus: 'fulfilled' as const },
});

describe('daySummarySlice', () => {
  it('keeps the answer for the day on screen', () => {
    const s = reducer(reducer(init(), setDayDate('2026-11-18')), fulfilled('2026-11-18', null));
    expect(s.summary?.date).toBe('2026-11-18');
  });

  it('drops a late answer for a day the user has left', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, setDayDate('2026-11-17'));
    s = reducer(s, fulfilled('2026-11-18', null));
    expect(s.summary).toBeNull();
    s = reducer(s, fulfilled('2026-11-17', null));
    expect(s.summary?.date).toBe('2026-11-17');
  });

  it('drops a late answer for another person', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, setDayCreatedBy('u-staff'));
    s = reducer(s, fulfilled('2026-11-18', null));
    expect(s.summary).toBeNull();
  });

  it('a new day, or a new person, starts the Day Book unfiltered', () => {
    let s = reducer(init(), setDayFilter('receipt'));
    expect(s.filter).toBe('receipt');
    s = reducer(s, setDayDate('2026-11-17'));
    expect(s.filter).toBe('all');
    s = reducer(reducer(s, setDayFilter('drafts')), setDayCreatedBy('u-staff'));
    expect(s.filter).toBe('all');
  });

  it('remembers a chosen day, so the focus refresh leaves it alone', () => {
    const s = reducer(init(), setDayDate('2026-11-01'));
    expect(s.isCustomDate).toBe(true);
    const back = reducer(s, daySummarySlice.actions.refreshDayDate());
    expect(back.date).toBe('2026-11-01');
  });
});
