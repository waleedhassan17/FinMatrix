jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { accountRegisterSlice, selectRegister } from '../AccountRegister/accountRegisterSlice';
import {
  hasMoreEntries,
  registerTies,
  type AccountRegister,
  type RegisterEntry,
} from '../../../models/accountRegisterModel';

const entry = (id: string, amount: number, runningBalance: number): RegisterEntry => ({
  id,
  date: '2026-02-01',
  reference: `JE-${id}`,
  memo: '',
  debit: amount > 0 ? amount : 0,
  credit: amount < 0 ? -amount : 0,
  amount,
  runningBalance,
  sourceType: 'invoice',
  sourceId: `inv-${id}`,
  sourceLabel: 'Invoice',
  documentNumber: `INV-${id}`,
  counterpartyName: 'Acme',
});

const page = (p: number, entries: RegisterEntry[]): AccountRegister => ({
  account: { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'asset', subType: 'Accounts Receivable' },
  range: { startDate: '2026-01-01', endDate: '2026-03-31' },
  openingBasis: 'cumulative',
  openingBalance: 100,
  periodDebit: 300,
  periodCredit: 50,
  closingBalance: 350,
  periodNet: 250,
  entries,
  total: 4,
  page: p,
  limit: 2,
});

/**
 * The register pages oldest first. Its running balance is the server's, so
 * what matters here is that pages join without losing or doubling a row, and
 * that a failed "load more" never throws away the pages already read.
 */
describe('account register', () => {
  const { fetchAccountRegister } = accountRegisterSlice.actions;
  const reduce = accountRegisterSlice.reducer;
  const base = accountRegisterSlice.getInitialState();
  const arg = { accountCode: '1100', startDate: '2026-01-01', endDate: '2026-03-31' };
  const root = (s: ReturnType<typeof reduce>) => ({ accountRegister: s });

  it('appends later pages and keeps the server running balance on each row', () => {
    let s = reduce(base, fetchAccountRegister.fulfilled(page(1, [entry('a', 100, 200), entry('b', 50, 250)]), 'r1', { ...arg, page: 1 }));
    expect(hasMoreEntries(selectRegister(root(s), arg).data)).toBe(true);

    s = reduce(s, fetchAccountRegister.pending('r2', { ...arg, page: 2 }));
    expect(selectRegister(root(s), arg).loadingMore).toBe(true);
    // A posting between the two requests shifted the window: "b" comes again.
    s = reduce(
      s,
      fetchAccountRegister.fulfilled(page(2, [entry('b', 50, 250), entry('c', 150, 400), entry('d', -50, 350)]), 'r2', { ...arg, page: 2 }),
    );
    const r = selectRegister(root(s), arg);
    expect(r.data?.entries.map(e => e.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(r.data?.entries.map(e => e.runningBalance)).toEqual([200, 250, 400, 350]);
    expect(r.loadingMore).toBe(false);
    expect(hasMoreEntries(r.data)).toBe(false);
  });

  it('keeps the pages already read when the next one fails', () => {
    let s = reduce(base, fetchAccountRegister.fulfilled(page(1, [entry('a', 100, 200)]), 'r1', { ...arg, page: 1 }));
    s = reduce(s, fetchAccountRegister.pending('r2', { ...arg, page: 2 }));
    s = reduce(s, fetchAccountRegister.rejected(null, 'r2', { ...arg, page: 2 }, { message: 'Timeout' }));
    const r = selectRegister(root(s), arg);
    expect(r.status).toBe('succeeded');
    expect(r.error).toBe('Timeout');
    expect(r.data?.entries).toHaveLength(1);
  });

  it('a page-one refresh replaces the rows', () => {
    let s = reduce(base, fetchAccountRegister.fulfilled(page(1, [entry('a', 100, 200)]), 'r1', { ...arg, page: 1 }));
    s = reduce(s, fetchAccountRegister.fulfilled(page(1, [entry('z', 10, 110)]), 'r2', { ...arg, page: 1 }));
    expect(selectRegister(root(s), arg).data?.entries.map(e => e.id)).toEqual(['z']);
  });

  it('marks an unknown account as not found', () => {
    const s = reduce(base, fetchAccountRegister.rejected(null, 'r', arg, { message: 'ACCOUNT_NOT_FOUND', status: 404 }));
    expect(selectRegister(root(s), arg).notFound).toBe(true);
  });

  it('keeps two registers for the same account apart by period', () => {
    const other = { ...arg, startDate: '2026-04-01', endDate: '2026-06-30' };
    const s = reduce(base, fetchAccountRegister.fulfilled(page(1, [entry('a', 1, 1)]), 'r', { ...arg, page: 1 }));
    expect(selectRegister(root(s), other).data).toBeNull();
  });

  it('ties a closing balance, and a movement only when the server sends one', () => {
    const r = page(1, []);
    expect(registerTies(r, { amount: 350, basis: 'closing' })).toBe(true);
    expect(registerTies(r, { amount: 350.004, basis: 'closing' })).toBe(true);
    expect(registerTies(r, { amount: 351, basis: 'closing' })).toBe(false);
    expect(registerTies(r, { amount: 250, basis: 'movement' })).toBe(true);
    expect(registerTies({ ...r, periodNet: null }, { amount: 250, basis: 'movement' })).toBeNull();
    expect(registerTies(r, undefined)).toBeNull();
  });
});
