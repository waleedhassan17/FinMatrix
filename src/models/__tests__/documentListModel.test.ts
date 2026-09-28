import { documentListSummaryOf, listPaginationOf, statusCountsOf } from '../documentListModel';

const payload = {
  success: true,
  data: [{ id: 'i1', status: 'sent' }],
  summary: {
    count: 312,
    outstanding: '85000.5000',
    overdue: '12000.0000',
    byStatus: { sent: { count: 40, balance: '50000' }, overdue: { count: 7, balance: '12000' }, paid: { count: 265, balance: '0' } },
  },
  pagination: { page: 2, limit: 50, total: 312, totalPages: 7 },
};

describe('documentListSummaryOf', () => {
  it('reads the server summary as numbers', () => {
    expect(documentListSummaryOf(payload)).toEqual({
      count: 312,
      outstanding: 85000.5,
      overdue: 12000,
      byStatus: { sent: { count: 40, balance: 50000 }, overdue: { count: 7, balance: 12000 }, paid: { count: 265, balance: 0 } },
    });
  });

  it('is null from a server that sends none', () => {
    expect(documentListSummaryOf({ success: true, data: [] })).toBeNull();
  });
});

describe('listPaginationOf', () => {
  it('reads pagination beside the rows', () => {
    expect(listPaginationOf(payload, 1)).toEqual({ page: 2, totalPages: 7, total: 312 });
  });

  it('reads it nested too, and falls back to one page of what came', () => {
    expect(listPaginationOf({ data: { pagination: { page: 1, totalPages: 3, total: 120 } } }, 50)).toEqual({ page: 1, totalPages: 3, total: 120 });
    expect(listPaginationOf({ data: [] }, 4)).toEqual({ page: 1, totalPages: 1, total: 4 });
  });
});

describe('statusCountsOf', () => {
  it("prefers the server's counts over the page held", () => {
    expect(statusCountsOf(documentListSummaryOf(payload), [{ status: 'sent' }])).toEqual({ all: 312, sent: 40, overdue: 7, paid: 265 });
  });

  it('counts what loaded when the server sent none', () => {
    expect(statusCountsOf(null, [{ status: 'sent' }, { status: 'sent' }, { status: 'paid' }])).toEqual({ all: 3, sent: 2, paid: 1 });
  });
});
