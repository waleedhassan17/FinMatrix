// The slice keeps the day on screen honest: a slow answer for a day the user
// has already stepped away from never overwrites the day they are looking at.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  extractErrorMessage: (e: { message?: string }) => e?.message ?? 'error',
}));

import {
  daySummarySlice,
  fetchDayEntries,
  fetchDayItems,
  fetchDaySchedule,
  fetchDaySummary,
  setItemGroupBy,
  setItemQuery,
  setItemSort,
  setSheetMode,
  setSheetRange,
  setDayCreatedBy,
  setDayDate,
  setDayFilter,
  setDayQuery,
} from '../daySummarySlice';
import {
  dayEntriesSerializer,
  dayItemSheetSerializer,
  daySummarySerializer,
} from '../../../../serializers/daySummarySerializer';
import { dayEntriesPage, dayItemSheetOwner, daySummaryOwner } from '../__fixtures__/daySummary';

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

  const entriesFulfilled = (arg: { date: string; query: string; page: number }) => ({
    type: fetchDayEntries.fulfilled.type,
    payload: dayEntriesSerializer({ ...dayEntriesPage, total: 120, countedTotal: 98000, excludedTotal: 450 }),
    meta: {
      arg: { createdBy: null as string | null, filter: 'all' as const, ...arg },
      requestId: 'r',
      requestStatus: 'fulfilled' as const,
    },
  });

  const entriesRejected = (arg: { date: string; page: number }) => ({
    type: fetchDayEntries.rejected.type,
    error: { message: 'socket hang up' },
    meta: {
      arg: { createdBy: null as string | null, filter: 'all' as const, query: '', ...arg },
      requestId: 'r',
      requestStatus: 'rejected' as const,
    },
  });

  it('a later page failing keeps the rows already shown, with a retry', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, entriesFulfilled({ date: '2026-11-18', query: '', page: 1 }));
    s = reducer(s, entriesRejected({ date: '2026-11-18', page: 2 }));
    expect(s.entries).toHaveLength(2);
    expect(s.entriesError).toBe('');
    expect(s.entriesMoreError).toBe('More entries could not be loaded.');
    s = reducer(s, entriesRejected({ date: '2026-11-18', page: 1 }));
    expect(s.entriesError).toMatch(/could not be loaded/);
    expect(s.entriesError).not.toContain('socket');
  });

  it('keeps the whole view’s totals and adds a next page to the list', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, entriesFulfilled({ date: '2026-11-18', query: '', page: 1 }));
    expect(s.entries).toHaveLength(2);
    expect([s.entriesTotal, s.entriesCounted, s.entriesExcluded]).toEqual([120, 98000, 450]);
    s = reducer(s, entriesFulfilled({ date: '2026-11-18', query: '', page: 2 }));
    expect(s.entries).toHaveLength(4);
    expect(s.entriesPage).toBe(2);
  });

  it('drops a Day Book page for a search the user has since changed', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, setDayQuery('  INV-0417 '));
    expect(s.query).toBe('INV-0417');
    s = reducer(s, entriesFulfilled({ date: '2026-11-18', query: '', page: 1 }));
    expect(s.entries).toHaveLength(0);
    s = reducer(s, entriesFulfilled({ date: '2026-11-18', query: 'INV-0417', page: 1 }));
    expect(s.entries).toHaveLength(2);
  });

  it('a new day clears the search', () => {
    let s = reducer(init(), setDayQuery('Ali'));
    s = reducer(s, setDayDate('2026-11-17'));
    expect(s.query).toBe('');
  });
});

describe('daySummarySlice — a failed load', () => {
  const rejected = (date: string, createdBy: string | null = null) => ({
    type: fetchDaySummary.rejected.type,
    error: { message: 'Network Error' },
    meta: { arg: { date, createdBy }, requestId: 'r', requestStatus: 'rejected' as const },
  });

  it('never leaves another day’s figures up under the new day', () => {
    let s = reducer(reducer(init(), setDayDate('2026-11-18')), fulfilled('2026-11-18', null));
    expect(s.summary?.date).toBe('2026-11-18');
    s = reducer(s, setDayDate('2026-11-17'));
    s = reducer(s, rejected('2026-11-17'));
    expect(s.summary).toBeNull();
    expect(s.error).toMatch(/could not be loaded/);
    expect(s.error).not.toContain('Network Error');
  });

  it('a failed refresh of the same day keeps its figures', () => {
    let s = reducer(reducer(init(), setDayDate('2026-11-18')), fulfilled('2026-11-18', null));
    s = reducer(s, rejected('2026-11-18'));
    expect(s.summary?.date).toBe('2026-11-18');
    expect(s.error).not.toBe('');
  });

  it('remembers that the digest settings could not be read', () => {
    const s = reducer(init(), { type: fetchDaySchedule.rejected.type, error: { message: 'x' }, meta: {} });
    expect(s.schedule).toBeNull();
    expect(s.scheduleLoadError).toMatch(/could not be loaded/);
  });
});

describe('daySummarySlice — item-wise sales', () => {
  const sheet = (from: string, to = from) => dayItemSheetSerializer({ ...dayItemSheetOwner, from, to });
  const items = (arg: { from: string; to: string; createdBy: string | null; compare: 'previous' | 'lastWeek' | null }) => ({
    pending: { type: fetchDayItems.pending.type, meta: { arg, requestId: 'p', requestStatus: 'pending' as const } },
    fulfilled: {
      type: fetchDayItems.fulfilled.type,
      payload: sheet(arg.from, arg.to),
      meta: { arg, requestId: 'f', requestStatus: 'fulfilled' as const },
    },
  });

  it('keeps the sheet for the period last asked for, and drops a late one', () => {
    const day = items({ from: '2026-11-18', to: '2026-11-18', createdBy: null, compare: 'previous' });
    const week = items({ from: '2026-11-12', to: '2026-11-18', createdBy: null, compare: 'previous' });
    let s = reducer(init(), day.pending);
    s = reducer(s, week.pending);
    s = reducer(s, day.fulfilled);
    expect(s.items).toBeNull();
    expect(s.itemsLoading).toBe(true);
    s = reducer(s, week.fulfilled);
    expect(s.items?.from).toBe('2026-11-12');
    expect(s.itemsLoading).toBe(false);
  });

  it('a range starts as the week ending on the day, and is read forwards', () => {
    let s = reducer(init(), setDayDate('2026-11-18'));
    s = reducer(s, setSheetMode('range'));
    expect([s.sheetFrom, s.sheetTo]).toEqual(['2026-11-12', '2026-11-18']);
    s = reducer(s, setSheetRange({ from: '2026-10-26', to: '2026-10-25' }));
    expect([s.sheetFrom, s.sheetTo]).toEqual(['2026-10-25', '2026-10-26']);
    s = reducer(s, setSheetMode('day'));
    // Back to the day; the range is remembered for next time.
    expect(s.sheetMode).toBe('day');
    expect(s.sheetFrom).toBe('2026-10-25');
  });

  it('a server from before the item sheet (404) hides the card instead of showing an error', () => {
    const arg = { from: '2026-11-18', to: '2026-11-18', createdBy: null as string | null, compare: 'previous' as const };
    let s = reducer(init(), items(arg).pending);
    s = reducer(s, {
      type: fetchDayItems.rejected.type,
      payload: { message: 'Not Found', status: 404 },
      meta: { arg, requestId: 'r', requestStatus: 'rejected' as const, rejectedWithValue: true },
      error: { message: 'Rejected' },
    });
    expect(s.itemsUnavailable).toBe(true);
    expect(s.itemsError).toBe('');
    // Any other failure is shown, so it can be retried.
    s = reducer(s, items(arg).pending);
    s = reducer(s, {
      type: fetchDayItems.rejected.type,
      payload: { message: 'Network Error', status: undefined },
      meta: { arg, requestId: 'r2', requestStatus: 'rejected' as const, rejectedWithValue: true },
      error: { message: 'Rejected' },
    });
    expect(s.itemsError).toBe('Network Error');
  });

  it('grouping, order and search are kept', () => {
    let s = reducer(init(), setItemGroupBy('agency'));
    s = reducer(s, setItemSort('value'));
    s = reducer(s, setItemQuery('  lactogen  '));
    expect([s.itemGroupBy, s.itemSort, s.itemQuery]).toEqual(['agency', 'value', 'lactogen']);
  });
});
