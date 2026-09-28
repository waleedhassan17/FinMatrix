// The invoice list is searched, filtered and paged BY THE SERVER. It used to
// load the latest page and search it on the phone, so an older invoice could
// not be found, and its tabs and tiles counted only that page.
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/sales/invoiceNetwork', () => ({
  getInvoicesAPI: jest.fn(),
  deleteInvoiceAPI: jest.fn(),
}));

import { getInvoicesAPI } from '../../../../networks/sales/invoiceNetwork';
import { fetchInvoices, invoiceListSlice, setSearchQuery, setStatusFilter } from '../invoiceListSlice';

const list = getInvoicesAPI as jest.Mock;
const makeStore = () => configureStore({ reducer: { invoiceList: invoiceListSlice.reducer } });

const row = (id: string, status = 'sent') => ({ id, invoiceNumber: `INV-${id}`, status, total: '100', amountPaid: '0', lines: [] as unknown[] });
const page = (ids: string[], p: number, totalPages: number, summary?: object) => ({
  success: true,
  data: ids.map(id => row(id)),
  pagination: { page: p, limit: 50, total: totalPages * 50, totalPages },
  ...(summary ? { summary } : {}),
});
const summary = { count: 120, outstanding: '9000', overdue: '1000', byStatus: { sent: { count: 80, balance: '8000' }, overdue: { count: 5, balance: '1000' } } };

beforeEach(() => jest.clearAllMocks());

it('sends the search and the tab to the server, a page of 50 at a time', async () => {
  list.mockResolvedValue(page(['a'], 1, 1, summary));
  const store = makeStore();
  store.dispatch(setSearchQuery('  INV-2025-0007 '));
  store.dispatch(setStatusFilter('overdue'));
  await store.dispatch(fetchInvoices());
  expect(list).toHaveBeenCalledWith({ page: 1, limit: 50, search: 'INV-2025-0007', status: 'overdue' });
});

it("keeps the server's summary for the tabs and tiles", async () => {
  list.mockResolvedValue(page(['a', 'b'], 1, 3, summary));
  const store = makeStore();
  await store.dispatch(fetchInvoices());
  const s = store.getState().invoiceList;
  expect(s.summary?.count).toBe(120);
  expect(s.summary?.outstanding).toBe(9000);
  expect(s.totalPages).toBe(3);
});

it('appends the next page, without repeats', async () => {
  list.mockResolvedValueOnce(page(['a', 'b'], 1, 2, summary));
  list.mockResolvedValueOnce(page(['b', 'c'], 2, 2, summary));
  const store = makeStore();
  await store.dispatch(fetchInvoices());
  await store.dispatch(fetchInvoices({ page: 2, append: true }));
  expect(store.getState().invoiceList.invoices.map(i => i.id)).toEqual(['a', 'b', 'c']);
  expect(list.mock.calls[1][0]).toEqual({ page: 2, limit: 50 });
});

it('drops a slower answer to an older search', async () => {
  let resolveOld: (v: unknown) => void = () => {};
  list.mockImplementationOnce(() => new Promise(r => { resolveOld = r; }));
  list.mockResolvedValueOnce(page(['new'], 1, 1, summary));
  const store = makeStore();
  store.dispatch(setSearchQuery('old'));
  const older = store.dispatch(fetchInvoices());
  store.dispatch(setSearchQuery('new'));
  await store.dispatch(fetchInvoices());
  resolveOld(page(['old'], 1, 1, summary));
  await older;
  expect(store.getState().invoiceList.invoices.map(i => i.id)).toEqual(['new']);
});

it('drops a next page that belongs to a search no longer shown', async () => {
  list.mockResolvedValueOnce(page(['a'], 1, 2, summary));
  const store = makeStore();
  await store.dispatch(fetchInvoices());
  let resolveMore: (v: unknown) => void = () => {};
  list.mockImplementationOnce(() => new Promise(r => { resolveMore = r; }));
  const more = store.dispatch(fetchInvoices({ page: 2, append: true }));
  store.dispatch(setSearchQuery('x'));
  list.mockResolvedValueOnce(page(['x1'], 1, 2, summary));
  await store.dispatch(fetchInvoices());
  resolveMore(page(['stale'], 2, 2, summary));
  await more;
  expect(store.getState().invoiceList.invoices.map(i => i.id)).toEqual(['x1']);
});
