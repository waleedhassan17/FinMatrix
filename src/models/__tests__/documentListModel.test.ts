import {
  documentListSummaryOf,
  listPaginationOf,
  statusCountsOf,
  fetchAllPages,
  appendUnique,
} from '../documentListModel';

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

describe('fetchAllPages', () => {
  const page = (rows: { id: string }[], p: number, totalPages: number) => ({
    success: true,
    data: rows,
    pagination: { page: p, limit: 2, total: 5, totalPages },
  });
  const serialize = (payload: any) => payload.data as { id: string }[];

  it('walks every page the server reports, in order', async () => {
    const pages = [[{ id: '1' }, { id: '2' }], [{ id: '3' }, { id: '4' }], [{ id: '5' }]];
    const asked: number[] = [];
    const rows = await fetchAllPages(async (p, limit) => {
      asked.push(p);
      expect(limit).toBe(2);
      return page(pages[p - 1], p, 3);
    }, serialize, 2);
    expect(asked).toEqual([1, 2, 3]);
    expect(rows.map(r => r.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('reads pagination nested under data (customers, vendors)', async () => {
    const rows = await fetchAllPages(
      async p => ({ success: true, data: { data: [{ id: `c${p}` }], pagination: { page: p, totalPages: 2, total: 2 } } }),
      (payload: any): { id: string }[] => payload.data.data,
      1,
    );
    expect(rows.map(r => r.id)).toEqual(['c1', 'c2']);
  });

  it('adds a row repeated on a later page only once, by a custom key', async () => {
    const riders = [[{ userId: 'u1' }], [{ userId: 'u1' }, { userId: 'u2' }]];
    const rows = await fetchAllPages(
      async p => ({ data: riders[p - 1], pagination: { page: p, totalPages: 2 } }),
      (payload: any) => payload.data as { userId: string }[],
      1,
      r => r.userId,
    );
    expect(rows.map(r => r.userId)).toEqual(['u1', 'u2']);
  });

  it('makes one request when there is no pagination (an older server)', async () => {
    let calls = 0;
    await fetchAllPages(async () => { calls++; return { data: [{ id: 'x' }] }; }, serialize);
    expect(calls).toBe(1);
  });
});

describe('appendUnique', () => {
  it('appends only rows not already held', () => {
    expect(appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]).map(r => r.id))
      .toEqual(['a', 'b', 'c']);
  });
});
