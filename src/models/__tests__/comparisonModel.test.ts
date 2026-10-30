import {
  asOfCompareDate,
  dayAfter,
  isValidCompareDate,
  priorFyEnd,
  priorMonthEnd,
  rangeCompare,
  sameLastYear,
} from '../comparisonModel';

describe('as-of comparisons', () => {
  it('prior month-end is the end of the previous month, even on a month end', () => {
    expect(priorMonthEnd('2026-10-26')).toBe('2026-09-30');
    expect(priorMonthEnd('2026-10-31')).toBe('2026-09-30');
    expect(priorMonthEnd('2026-03-15')).toBe('2026-02-28');
    expect(priorMonthEnd('2024-03-01')).toBe('2024-02-29');
    expect(priorMonthEnd('2026-01-10')).toBe('2025-12-31');
  });

  it('prior FY end is the day before the server-given fiscal year start', () => {
    expect(priorFyEnd('2026-10-26', '2026-07-01')).toBe('2026-06-30');
    expect(priorFyEnd('2026-10-26', '2026-01-01')).toBe('2025-12-31');
    // On the first day of the year, the prior year end is the day before.
    expect(priorFyEnd('2026-07-01', '2026-07-01')).toBe('2026-06-30');
  });

  it('refuses a fiscal year start it cannot use', () => {
    expect(priorFyEnd('2026-10-26', null)).toBeNull();
    expect(priorFyEnd('2026-10-26', '2027-01-01')).toBeNull();
    expect(priorFyEnd('2026-10-26', 'not a date')).toBeNull();
  });

  it('accepts a custom date only before the report date', () => {
    expect(isValidCompareDate('2026-09-01', '2026-10-26')).toBe(true);
    expect(isValidCompareDate('2026-10-26', '2026-10-26')).toBe(false);
    expect(isValidCompareDate('2026-11-01', '2026-10-26')).toBe(false);
    expect(asOfCompareDate('custom', '2026-10-26', null, '2026-11-01')).toBeNull();
    expect(asOfCompareDate('custom', '2026-10-26', null, '2026-08-15')).toBe('2026-08-15');
    expect(asOfCompareDate('none', '2026-10-26', '2026-01-01', null)).toBeNull();
  });

  it('a register opened since a comparison date starts the day after it', () => {
    expect(dayAfter('2026-09-30')).toBe('2026-10-01');
    expect(dayAfter('2024-02-28')).toBe('2024-02-29');
  });
});

describe('range comparisons', () => {
  it('same period last year keeps a month end a month end across leap years', () => {
    expect(sameLastYear({ startDate: '2025-02-01', endDate: '2025-02-28' })).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
    expect(sameLastYear({ startDate: '2024-02-01', endDate: '2024-02-29' })).toEqual({
      startDate: '2023-02-01',
      endDate: '2023-02-28',
    });
    expect(sameLastYear({ startDate: '2026-07-01', endDate: '2026-09-30' })).toEqual({
      startDate: '2025-07-01',
      endDate: '2025-09-30',
    });
  });

  it('a mid-month end stays the same day', () => {
    expect(sameLastYear({ startDate: '2026-01-01', endDate: '2026-10-26' })).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-10-26',
    });
  });

  it('previous period takes the whole months before whole months', () => {
    expect(rangeCompare('previousPeriod', { startDate: '2026-07-01', endDate: '2026-09-30' })).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-06-30',
    });
    expect(rangeCompare('none', { startDate: '2026-07-01', endDate: '2026-09-30' })).toBeNull();
  });
});
