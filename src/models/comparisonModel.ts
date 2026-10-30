// ═══════════════════════════════════════════════════════
// FinMatrix — What a report is compared against
// ═══════════════════════════════════════════════════════
// Date arithmetic only: which date or range the prior column is read at. The
// figures for it come from the server like any other — choosing "prior FY
// end" picks a date, it never computes a balance.
//
// An as-of report (balance sheet) compares two moments; a range report (cash
// flow, P&L) compares two periods. The choices differ because the questions
// do: "what did we own at the last year end" against "how did this quarter do
// against the last one".

import dayjs from 'dayjs';

import { priorWindow, type ReportDateRange } from './reportModel';

const ISO = 'YYYY-MM-DD';

export type AsOfCompareKey = 'none' | 'priorMonthEnd' | 'priorFyEnd' | 'custom';
export type RangeCompareKey = 'none' | 'previousPeriod' | 'sameLastYear';

export const AS_OF_COMPARE_OPTIONS: { key: AsOfCompareKey; label: string }[] = [
  { key: 'none', label: 'No comparison' },
  { key: 'priorMonthEnd', label: 'Prior month-end' },
  { key: 'priorFyEnd', label: 'Prior fiscal year-end' },
  { key: 'custom', label: 'Custom date' },
];

export const RANGE_COMPARE_OPTIONS: { key: RangeCompareKey; label: string }[] = [
  { key: 'none', label: 'No comparison' },
  { key: 'previousPeriod', label: 'Previous period' },
  { key: 'sameLastYear', label: 'Same period last year' },
];

const isIso = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayjs(v).isValid();

/**
 * The last day of the month before the one `asOf` falls in. On a month end it
 * is still the PREVIOUS month: as of 31 October, the prior month-end is
 * 30 September, not the same day.
 */
export const priorMonthEnd = (asOf: string): string =>
  dayjs(asOf).startOf('month').subtract(1, 'day').format(ISO);

/**
 * The day before the current fiscal year began — the last year end.
 *
 * `fiscalYearStart` is the server's (the balance sheet returns it): the device
 * does not decide when a company's year starts. Null when the server did not
 * say, or when the year it names has not begun by `asOf`.
 */
export const priorFyEnd = (asOf: string, fiscalYearStart: string | null): string | null => {
  if (!isIso(fiscalYearStart) || !isIso(asOf)) return null;
  if (dayjs(fiscalYearStart).isAfter(dayjs(asOf), 'day')) return null;
  return dayjs(fiscalYearStart).subtract(1, 'day').format(ISO);
};

/** A custom comparison date is usable only strictly before the report date. */
export const isValidCompareDate = (compareTo: string | null, asOf: string): compareTo is string =>
  isIso(compareTo) && dayjs(compareTo).isBefore(dayjs(asOf), 'day');

/** The date an as-of report's prior column is read at, or null for none. */
export const asOfCompareDate = (
  key: AsOfCompareKey,
  asOf: string,
  fiscalYearStart: string | null,
  custom: string | null,
): string | null => {
  switch (key) {
    case 'priorMonthEnd':
      return priorMonthEnd(asOf);
    case 'priorFyEnd':
      return priorFyEnd(asOf, fiscalYearStart);
    case 'custom':
      return isValidCompareDate(custom, asOf) ? custom : null;
    default:
      return null;
  }
};

const isMonthEnd = (d: dayjs.Dayjs): boolean => d.date() === d.daysInMonth();

/**
 * Shift one date back a year. A month end stays a month end, so February runs
 * to the 29th in a leap year and the 28th otherwise, whichever way the shift
 * goes; 29 February itself lands on the 28th.
 */
const lastYear = (iso: string): string => {
  const d = dayjs(iso);
  const shifted = d.subtract(1, 'year');
  return (isMonthEnd(d) ? shifted.endOf('month') : shifted).format(ISO);
};

/** The same dates a year earlier: Q3 against last year's Q3. */
export const sameLastYear = (range: ReportDateRange): ReportDateRange => ({
  startDate: lastYear(range.startDate),
  endDate: lastYear(range.endDate),
});

/** The period a range report's prior column covers, or null for none. */
export const rangeCompare = (key: RangeCompareKey, range: ReportDateRange): ReportDateRange | null => {
  switch (key) {
    case 'previousPeriod':
      // Whole months compare with the same number of whole months before
      // them; anything else with the window of equal length — reportModel's
      // rule, shared with the explorers.
      return priorWindow(range);
    case 'sameLastYear':
      return sameLastYear(range);
    default:
      return null;
  }
};

/** The day after a date: a register opened "since" a comparison date starts here. */
export const dayAfter = (iso: string): string => dayjs(iso).add(1, 'day').format(ISO);
