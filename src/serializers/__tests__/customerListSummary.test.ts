// "Owed to you" comes from the server's company-wide summary. Adding up the
// customers in the list only counted the pages loaded so far.
jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { customerListSerializer } from '../customerSerializer';

describe('customerListSerializer summary', () => {
  it('reads the totals the server nests beside the rows, as numbers', () => {
    const out = customerListSerializer({
      data: {
        data: [{ id: 'c1', name: 'abc', balance: '50.0000' }],
        summary: { total: 240, outstandingBalance: '122115.1400' },
        pagination: { page: 1, totalPages: 5, total: 240 },
      },
    });
    expect(out.summary).toEqual({ total: 240, outstandingBalance: 122115.14 });
    // The totals are not the sum of this one page.
    expect(out.customers.reduce((sum, c) => sum + c.balance, 0)).toBe(50);
  });

  it('is null when the server sends none, so the screen can fall back', () => {
    expect(customerListSerializer({ data: [{ id: 'c1', name: 'abc' }] }).summary).toBeNull();
    expect(customerListSerializer({ data: { data: [] } }).summary).toBeNull();
  });
});
