// The app ships to phones and updates when the user lets it, so a build
// carrying configurable buckets will meet a server that still returns only the
// classic five fields — and, for a while, the reverse. These pin both
// directions, because the failure mode of getting it wrong is a table of
// blanks that looks like a company with no receivables.

jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { arAgingSerializer } from '../arAgingSerializer';
import { overdueTotal, notYetDueTotal } from '../../models/arAgingModel';

const legacyRow = {
  customerId: 'c1',
  customerName: 'Acme',
  current: 100,
  bucket1to30: 50,
  bucket31to60: 25,
  bucket61to90: 10,
  bucket90Plus: 5,
  total: 190,
};

describe('arAgingSerializer', () => {
  it('reads the modern bucket payload', () => {
    const r = arAgingSerializer({
      success: true,
      data: {
        asOfDate: '2026-09-21',
        preset: 'days3',
        buckets: [
          { key: 'current', label: 'Current', minDays: 0, maxDays: 0 },
          { key: 'd1to3', label: '1–3', minDays: 1, maxDays: 3 },
          { key: 'd4plus', label: '4 and over', minDays: 4, maxDays: null },
        ],
        rows: [
          { customerId: 'c1', customerName: 'Acme', amounts: { current: 10, d1to3: 20, d4plus: 30 }, total: 60 },
        ],
        totals: { amounts: { current: 10, d1to3: 20, d4plus: 30 }, total: 60 },
      },
    } as any)!;

    expect(r.preset).toBe('days3');
    expect(r.buckets).toHaveLength(3);
    expect(r.rows[0].amounts.d1to3).toBe(20);
    // Overdue follows the spec, not a hardcoded "31 days and over".
    expect(overdueTotal(r)).toBe(50);
    expect(notYetDueTotal(r)).toBe(10);
  });

  it('rebuilds the classic columns from a server that predates buckets[]', () => {
    const r = arAgingSerializer({
      success: true,
      data: {
        asOfDate: '2026-09-21',
        rows: [legacyRow],
        totals: { ...legacyRow },
      },
    } as any)!;

    expect(r.buckets.map(b => b.key)).toEqual([
      'current', 'd1to30', 'd31to60', 'd61to90', 'd91plus',
    ]);
    expect(r.rows[0].amounts).toEqual({
      current: 100, d1to30: 50, d31to60: 25, d61to90: 10, d91plus: 5,
    });
    // The rebuilt columns foot to the total the server sent.
    const summed = r.buckets.reduce((t, b) => t + r.totals.amounts[b.key], 0);
    expect(summed).toBe(r.totals.total);
    expect(r.preset).toBe('monthly');
  });

  it('coerces numeric strings rather than rendering Rs NaN', () => {
    // The aging columns are Postgres `numeric`; an unwrapped one arrives as a
    // string and formatCurrency would print NaN with no error to explain it.
    const r = arAgingSerializer({
      success: true,
      data: {
        asOfDate: '2026-09-21',
        rows: [{ ...legacyRow, current: '100.50', total: '190.50' }],
        totals: { ...legacyRow, current: '100.50', total: '190.50' },
      },
    } as any)!;

    expect(r.rows[0].amounts.current).toBe(100.5);
    expect(r.totals.total).toBe(190.5);
    expect(Number.isNaN(r.rows[0].amounts.d1to30)).toBe(false);
  });

  it('survives an empty company without throwing', () => {
    const r = arAgingSerializer({ success: true, data: { asOfDate: '2026-09-21' } } as any)!;
    expect(r.rows).toEqual([]);
    expect(r.totals.total).toBe(0);
    expect(r.buckets.length).toBeGreaterThan(0);
    expect(overdueTotal(r)).toBe(0);
  });

  it('returns null when there is no payload at all', () => {
    expect(arAgingSerializer(null as any)).toBeNull();
  });
});
