jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import {
  inlineEntriesSlice,
  needsInlineFetch,
  selectInlineEntries,
} from '../shared/inlineEntriesSlice';
import type { AccountRegister } from '../../../models/accountRegisterModel';

/**
 * The latest postings under a statement line, shared by every statement.
 *
 *   • each line AND period has its own entry — Q1's rows can never appear
 *     under Q2's figure, which would be invisible: the line would be right
 *     and the rows under it from another quarter;
 *   • a failure stays on its line, with its message, and is retried;
 *   • a 404 (a server without registers) is final, not retried forever.
 */
describe('inline entries', () => {
  const { fetchInlineEntries, clearInlineEntries } = inlineEntriesSlice.actions;
  const reduce = inlineEntriesSlice.reducer;
  const base = inlineEntriesSlice.getInitialState();
  const q1 = { accountCode: '4000', startDate: '2026-01-01', endDate: '2026-03-31' };
  const q2 = { accountCode: '4000', startDate: '2026-04-01', endDate: '2026-06-30' };
  const root = (s: ReturnType<typeof reduce>) => ({ reportDrill: s });

  const register: AccountRegister = {
    account: { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'revenue', subType: '' },
    range: { startDate: '2026-01-01', endDate: '2026-03-31' },
    openingBasis: 'cumulative',
    openingBalance: 0,
    periodDebit: 0,
    periodCredit: 1200,
    closingBalance: 1200,
    periodNet: 1200,
    entries: [],
    total: 12,
    page: 1,
    limit: 5,
  };

  it('keeps one entry per account and period', () => {
    let s = reduce(base, fetchInlineEntries.pending('r1', q1));
    expect(selectInlineEntries(root(s), q1)?.status).toBe('loading');
    expect(selectInlineEntries(root(s), q2)).toBeUndefined();

    s = reduce(s, fetchInlineEntries.fulfilled(register, 'r1', q1));
    expect(selectInlineEntries(root(s), q1)?.data?.total).toBe(12);
    expect(selectInlineEntries(root(s), q2)).toBeUndefined();
  });

  it('keeps a failure on the line that failed, with its message, and retries it', () => {
    const s = reduce(
      base,
      fetchInlineEntries.rejected(null, 'r', q1, { message: 'Network unreachable' }),
    );
    const e = selectInlineEntries(root(s), q1);
    expect(e?.status).toBe('failed');
    expect(e?.error).toBe('Network unreachable');
    expect(e?.notFound).toBe(false);
    expect(needsInlineFetch(e)).toBe(true);
  });

  it('treats a 404 as an answer, not something to retry', () => {
    const s = reduce(
      base,
      fetchInlineEntries.rejected(null, 'r', q1, { message: 'Not Found', status: 404 }),
    );
    const e = selectInlineEntries(root(s), q1);
    expect(e?.notFound).toBe(true);
    expect(needsInlineFetch(e)).toBe(false);
  });

  it('keeps rows already shown while they refresh, and after a failed refresh', () => {
    let s = reduce(base, fetchInlineEntries.fulfilled(register, 'r1', q1));
    s = reduce(s, fetchInlineEntries.pending('r2', q1));
    expect(selectInlineEntries(root(s), q1)?.data?.total).toBe(12);
    s = reduce(s, fetchInlineEntries.rejected(null, 'r2', q1, { message: 'Timeout' }));
    expect(selectInlineEntries(root(s), q1)?.data?.total).toBe(12);
  });

  it('forgets everything on a pull-to-refresh', () => {
    let s = reduce(base, fetchInlineEntries.fulfilled(register, 'r1', q1));
    s = reduce(s, clearInlineEntries());
    expect(selectInlineEntries(root(s), q1)).toBeUndefined();
    expect(needsInlineFetch(undefined)).toBe(true);
  });
});
