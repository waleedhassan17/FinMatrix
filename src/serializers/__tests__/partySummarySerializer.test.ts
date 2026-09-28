// Same stub as the aging serializer's test: the serializer reaches the report
// helpers only for `unwrapEnvelope`, and the real network module pulls in
// Expo's environment, which Jest cannot load.
jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { partySummarySerializer } from '../partySummarySerializer';

const payload: Record<string, any> = {
  partyType: 'customer',
  party: {
    id: 'c1', name: 'Acme Traders', contactPerson: null, email: 'a@acme.pk', phone: '0300 1234567',
    address: '12 Mall Road, Lahore', paymentTerms: 'net30', taxId: null,
  },
  asOfDate: '2026-09-28',
  preset: 'monthly',
  buckets: [
    { key: 'current', label: 'Current', minDays: 0, maxDays: 0, amount: '300', count: 1 },
    { key: 'd91plus', label: '91 and over', minDays: 91, maxDays: null, amount: 0, count: 0 },
  ],
  documents: [
    {
      documentId: 'i1', documentType: 'invoice', documentNumber: 'INV-1', issueDate: '2026-07-01',
      dueDate: '2026-08-14', daysOverdue: -3, bucketKey: 'current', bucketLabel: 'Current',
      total: '500.0000', amountPaid: '200.0000', balance: '300.0000', status: 'partial',
    },
  ],
  totals: { count: 1, outstanding: '300.00', overdue: 0, overdueCount: 0, notYetDue: 300 },
  credits: {
    total: '120',
    items: [{ kind: 'credit_memo', id: 'm1', reference: 'CM-1', date: '2026-09-01', amount: '150', available: '120' }],
  },
  netDue: 180,
  lastPayment: { date: '2026-09-20', amount: '200.0000', reference: null },
};

describe('partySummarySerializer', () => {
  it('reads the enveloped summary, numbers as numbers', () => {
    const s = partySummarySerializer({ success: true, data: payload })!;
    expect(s.party).toEqual({
      id: 'c1', name: 'Acme Traders', contactPerson: '', email: 'a@acme.pk', phone: '0300 1234567',
      address: '12 Mall Road, Lahore', paymentTerms: 'net30', taxId: '',
    });
    expect(s.buckets[0]).toEqual({ key: 'current', label: 'Current', minDays: 0, maxDays: 0, amount: 300, count: 1 });
    expect(s.buckets[1].maxDays).toBeNull();
    expect(s.documents[0]).toMatchObject({ total: 500, amountPaid: 200, balance: 300, daysOverdue: -3 });
    expect(s.totals).toEqual({ count: 1, outstanding: 300, overdue: 0, overdueCount: 0, notYetDue: 300 });
    expect(s.credits.items[0]).toEqual({
      kind: 'credit_memo', id: 'm1', reference: 'CM-1', date: '2026-09-01', amount: 150, available: 120,
    });
    expect(s.netDue).toBe(180);
    expect(s.lastPayment).toEqual({ date: '2026-09-20', amount: 200, reference: '' });
  });

  it('never reads a missing net figure as nothing due', () => {
    const withoutNet = { ...payload };
    delete withoutNet.netDue;
    expect(partySummarySerializer({ success: true, data: withoutNet })!.netDue).toBe(180);
  });

  it('is empty, not broken, for a partial payload — and null for nothing', () => {
    const s = partySummarySerializer({ success: true, data: { partyType: 'vendor' } })!;
    expect(s.partyType).toBe('vendor');
    expect(s.documents).toEqual([]);
    expect(s.credits).toEqual({ total: 0, items: [] });
    expect(s.lastPayment).toBeNull();
    expect(partySummarySerializer(null)).toBeNull();
  });
});
