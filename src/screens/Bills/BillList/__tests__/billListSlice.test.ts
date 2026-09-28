// The bill list is searched, filtered and paged BY THE SERVER, and its tabs
// and tiles are the server's counts over every bill the search matches.
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/purchases/billNetwork', () => ({
  getBillsAPI: jest.fn(),
  createBillAPI: jest.fn(),
  updateBillAPI: jest.fn(),
  deleteBillAPI: jest.fn(),
}));

import { getBillsAPI } from '../../../../networks/purchases/billNetwork';
import { billListSlice, fetchBills, setSearchQuery, setStatusFilter } from '../billListSlice';

const list = getBillsAPI as jest.Mock;
const makeStore = () => configureStore({ reducer: { billList: billListSlice.reducer } });
const bill = (id: string, status = 'open') => ({ id, billNumber: `B-${id}`, status, total: '100', amountPaid: '0', lines: [] as unknown[] });

beforeEach(() => jest.clearAllMocks());

it('sends the search and the tab to the server, a page of 50 at a time', async () => {
  list.mockResolvedValue({ success: true, data: [bill('a')] });
  const store = makeStore();
  store.dispatch(setSearchQuery('acme'));
  store.dispatch(setStatusFilter('overdue'));
  await store.dispatch(fetchBills());
  expect(list).toHaveBeenCalledWith({ page: 1, limit: 50, search: 'acme', status: 'overdue' });
});

it("counts every tab from the server's summary, even while one tab is shown", async () => {
  list.mockResolvedValue({
    success: true,
    data: [bill('a', 'overdue')],
    summary: {
      count: 90,
      outstanding: '5000',
      overdue: '700',
      byStatus: { open: { count: 30, balance: '4300' }, overdue: { count: 1, balance: '700' }, paid: { count: 59, balance: '0' } },
    },
    pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
  });
  const store = makeStore();
  store.dispatch(setStatusFilter('overdue'));
  await store.dispatch(fetchBills());
  const s = store.getState().billList;
  expect(s.counts).toMatchObject({ all: 90, open: 30, overdue: 1, paid: 59 });
  expect(s.totalOutstanding).toBe(5000);
  expect(s.overdueAmount).toBe(700);
});

it('appends the next page', async () => {
  list.mockResolvedValueOnce({ success: true, data: [bill('a')], pagination: { page: 1, totalPages: 2, total: 60 } });
  list.mockResolvedValueOnce({ success: true, data: [bill('b')], pagination: { page: 2, totalPages: 2, total: 60 } });
  const store = makeStore();
  await store.dispatch(fetchBills());
  await store.dispatch(fetchBills({ page: 2, append: true }));
  expect(store.getState().billList.bills.map(b => b.id)).toEqual(['a', 'b']);
});
