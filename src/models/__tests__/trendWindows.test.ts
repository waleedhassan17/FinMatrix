import {
  matchTrendWindow,
  monthsSpanned,
  priorWindow,
  trailingMonths,
  trendWindowRange,
} from '../reportModel';
import { niceAxis } from '../chartAxisModel';

// A fixed reference date so the suite does not depend on the calendar.
const TODAY = new Date(2026, 4, 20);

describe('trend windows', () => {
  it('trails whole months to today', () => {
    expect(trailingMonths(12, TODAY)).toEqual({ startDate: '2025-06-01', endDate: '2026-05-20' });
    expect(trendWindowRange('last6m', TODAY)).toEqual({ startDate: '2025-12-01', endDate: '2026-05-20' });
    expect(trendWindowRange('ytd', TODAY)).toEqual({ startDate: '2026-01-01', endDate: '2026-05-20' });
  });

  it('recognises its own windows and nothing else', () => {
    expect(matchTrendWindow(trendWindowRange('last24m', TODAY), TODAY)).toBe('last24m');
    expect(matchTrendWindow({ startDate: '2026-02-03', endDate: '2026-05-20' }, TODAY)).toBeNull();
  });

  it('counts the calendar months a range touches', () => {
    expect(monthsSpanned({ startDate: '2025-06-01', endDate: '2026-05-20' })).toBe(12);
  });
});

describe('priorWindow', () => {
  it('compares a trailing window with the same months a year before', () => {
    expect(priorWindow({ startDate: '2025-06-01', endDate: '2026-05-20' })).toEqual({
      startDate: '2024-06-01',
      endDate: '2025-05-20',
    });
  });

  it('keeps a month end on a month end', () => {
    expect(priorWindow({ startDate: '2026-03-01', endDate: '2026-03-31' })).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });
});

describe('niceAxis', () => {
  it('steps in round numbers and keeps units whole', () => {
    expect(niceAxis([0, 96370, 59000]).ticks).toEqual([0, 25000, 50000, 75000, 100000]);
    expect(niceAxis([0, 1, 2], { integer: true }).ticks).toEqual([0, 1, 2]);
    expect(niceAxis([null, null])).toEqual({ domain: [0, 1], ticks: [0] });
  });
});
