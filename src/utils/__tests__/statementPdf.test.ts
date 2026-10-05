// The account statement a customer or vendor is sent. What must hold: drafts
// and voids never reach it (the server leaves them out), credits bring the
// balance down and refunds put it back, and the running balance lands on the
// server's closing figure.

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));

import { buildStatementHtml, statementSerializer, vendorStatementSerializer } from '../statementPdf';

const customerPayload = {
  data: {
    partyType: 'customer',
    party: { id: 'c1', code: 'C-0007', name: 'Madina Wholesale', email: 'm@x.pk' },
    period: { startDate: '2026-02-01', endDate: '2026-02-28' },
    openingBalance: 300,
    lines: [
      { id: 'g1', date: '2026-02-01', kind: 'invoice', label: 'Invoice', reference: 'INV-1', amount: 1200, balance: 1500 },
      { id: 'g2', date: '2026-02-05', kind: 'credit_memo', label: 'Credit memo', reference: 'CM-1', amount: -200, balance: 1300 },
      { id: 'g3', date: '2026-02-06', kind: 'refund', label: 'Refund', reference: 'CM-1', amount: 50, balance: 1350 },
      { id: 'g4', date: '2026-02-10', kind: 'payment', label: 'Receipt', reference: 'RCT-1', amount: -500, balance: 850 },
    ],
    totals: { invoiced: 1200, received: 500, credited: 200, refunded: 50, other: 0 },
    closingBalance: 850,
  },
};

describe('statementSerializer', () => {
  it('reads every line in the server\'s order, each with its direction', () => {
    const s = statementSerializer(customerPayload)!;
    expect(s.lines.map(l => [l.label, l.type, l.reference, l.amount])).toEqual([
      ['Invoice', 'charge', 'INV-1', 1200],
      ['Credit memo', 'credit', 'CM-1', 200],
      ['Refund', 'charge', 'CM-1', 50],
      ['Receipt', 'credit', 'RCT-1', 500],
    ]);
    expect([s.totalCredited, s.totalRefunded, s.closingBalance]).toEqual([200, 50, 850]);
    expect(s.partyCode).toBe('C-0007');
  });

  it('refuses a payload that is not a statement', () => {
    expect(statementSerializer({ data: { customer: { id: 'c1' } } })).toBeNull();
  });
});

describe('buildStatementHtml', () => {
  it('runs the balance from opening to closing, credits in their own column', () => {
    const html = buildStatementHtml(statementSerializer(customerPayload)!, { name: 'Warehouse Co', addressLine1: '' });
    // 300 + 1200 = 1500, − 200 = 1300, + 50 = 1350, − 500 = 850.
    for (const figure of ['Rs 1,500.00', 'Rs 1,300.00', 'Rs 1,350.00', 'Rs 850.00']) {
      expect(html).toContain(figure);
    }
    expect(html).toContain('<td>Credit memo</td>');
    expect(html).toContain('<td>Refund</td>');
    expect(html).toContain('Customer ID C-0007');
    expect(html).toContain('Credit memos');
    expect(html).toContain('Refunds paid');
  });

  it('speaks of bills and vendor credits on a vendor statement', () => {
    const s = vendorStatementSerializer({
      data: {
        partyType: 'vendor',
        party: { id: 'v1', code: 'V-0003', name: 'Habib Oil Mills', email: null },
        period: { startDate: '2026-03-01', endDate: '2026-03-31' },
        openingBalance: 0,
        lines: [
          { id: 'g1', date: '2026-03-02', kind: 'bill', label: 'Bill', reference: 'B-9', amount: 5000, balance: 5000 },
          { id: 'g2', date: '2026-03-09', kind: 'vendor_credit', label: 'Vendor credit', reference: 'VC-3', amount: -800, balance: 4200 },
          { id: 'g3', date: '2026-03-20', kind: 'payment', label: 'Payment', reference: 'CHQ 1', amount: -1000, balance: 3200 },
        ],
        totals: { billed: 5000, paid: 1000, credited: 800, other: 0 },
        closingBalance: 3200,
      },
    })!;
    expect(s.lines.map(l => l.label)).toEqual(['Bill', 'Vendor credit', 'Payment']);
    const html = buildStatementHtml(s, { name: 'Warehouse Co', addressLine1: '' });
    expect(html).toContain('Billed this period');
    expect(html).toContain('Payments made');
    expect(html).toContain('Vendor credits');
    expect(html).toContain('Rs 3,200.00');
    expect(html).not.toContain('Refunds paid');
  });
});
