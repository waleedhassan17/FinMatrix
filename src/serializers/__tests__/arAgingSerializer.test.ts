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

import { agingPartyDocumentsSerializer, arAgingSerializer } from '../arAgingSerializer';
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

/**
 * The drill-down payload. Same coercion concern as the report above — these are
 * Postgres `numeric` and arrive as strings — plus one of its own: daysOverdue
 * is signed, and 0 and negative are both real answers.
 */
describe('agingPartyDocumentsSerializer', () => {
  const payload = {
    partyType: 'customer',
    partyId: 'c1',
    partyName: 'Allama Traders',
    asOfDate: '2026-09-22',
    preset: 'monthly',
    buckets: [
      { key: 'current', label: 'Current', minDays: 0, maxDays: 0 },
      { key: 'd1to30', label: '1–30', minDays: 1, maxDays: 30 },
      { key: 'd31plus', label: '31 and over', minDays: 31, maxDays: null },
    ],
    bucket: 'd1to30',
    outstandingTotal: '300.00',
    documents: [
      {
        documentId: 'i1',
        documentType: 'invoice',
        documentNumber: 'INV-1',
        issueDate: '2026-08-01',
        dueDate: '2026-09-01',
        daysOverdue: 21,
        bucketKey: 'd1to30',
        bucketLabel: '1–30',
        total: '500.00',
        amountPaid: '200.00',
        balance: '300.00',
        status: 'partial',
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  };

  it('reads the party, the spec and the documents', () => {
    const d = agingPartyDocumentsSerializer(payload)!;
    expect(d.partyName).toBe('Allama Traders');
    expect(d.bucket).toBe('d1to30');
    expect(d.buckets).toHaveLength(3);
    expect(d.buckets[2].maxDays).toBeNull();
    expect(d.documents[0].documentNumber).toBe('INV-1');
  });

  it('coerces every money field off the numeric strings', () => {
    const d = agingPartyDocumentsSerializer(payload)!;
    expect(d.outstandingTotal).toBe(300);
    expect(d.documents[0].total).toBe(500);
    expect(d.documents[0].balance).toBe(300);
    // The contract that makes the panel reconcilable against its row.
    expect(d.documents.reduce((t, x) => t + x.balance, 0)).toBe(d.outstandingTotal);
  });

  it('keeps a negative daysOverdue for a document that is not yet due', () => {
    const d = agingPartyDocumentsSerializer({
      ...payload,
      documents: [
        { ...payload.documents[0], daysOverdue: -4 },
        { ...payload.documents[0], documentId: 'i2', daysOverdue: 0 },
      ],
    })!;
    expect(d.documents[0].daysOverdue).toBe(-4);
    expect(d.documents[1].daysOverdue).toBe(0);
  });

  it('reads the payables side', () => {
    const d = agingPartyDocumentsSerializer({
      ...payload,
      partyType: 'vendor',
      partyName: 'Supplier Co',
      documents: [{ ...payload.documents[0], documentType: 'bill' }],
    })!;
    expect(d.partyType).toBe('vendor');
    expect(d.documents[0].documentType).toBe('bill');
  });

  it('tolerates a bare array, so an envelope regression cannot blank the panel', () => {
    const d = agingPartyDocumentsSerializer(payload.documents)!;
    expect(d.documents).toHaveLength(1);
    expect(d.documents[0].documentNumber).toBe('INV-1');
  });

  it('zeroes a malformed payload rather than throwing', () => {
    const d = agingPartyDocumentsSerializer({})!;
    expect(d.documents).toEqual([]);
    expect(d.outstandingTotal).toBe(0);
    expect(d.partyName).toBe('Unknown');
  });

  it('returns null when there is no payload at all', () => {
    expect(agingPartyDocumentsSerializer(null)).toBeNull();
  });
});
