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
    customer: { id: 'c1', name: 'Madina Wholesale', email: 'm@x.pk' },
    period: { startDate: '2026-02-01', endDate: '2026-02-28' },
    openingBalance: '300.0000',
    invoices: [{ id: 'i1', invoiceNumber: 'INV-1', invoiceDate: '2026-02-01', total: '1200.0000' }],
    payments: [{ id: 'p1', paymentNumber: 'RCT-1', paymentDate: '2026-02-10', amount: '500.0000' }],
    creditMemos: [{ id: 'm1', creditMemoNumber: 'CM-1', date: '2026-02-05', total: '200.0000' }],
    refunds: [{ id: 'g1', creditMemoNumber: 'CM-1', date: '2026-02-06', amount: '50.0000' }],
    totals: { invoiced: '1200', received: '500', credited: '200', refunded: '50' },
    closingBalance: '850.0000',
  },
};

describe('statementSerializer', () => {
  it('reads every kind of event, in date order, each with its direction', () => {
    const s = statementSerializer(customerPayload)!;
    expect(s.lines.map(l => [l.label, l.type, l.reference, l.amount])).toEqual([
      ['Invoice', 'charge', 'INV-1', 1200],
      ['Credit memo', 'credit', 'CM-1', 200],
      ['Refund', 'charge', 'CM-1', 50],
      ['Payment', 'credit', 'RCT-1', 500],
    ]);
    expect([s.totalCredited, s.totalRefunded, s.closingBalance]).toEqual([200, 50, 850]);
  });

  it('reads an older server, with no credits, as having none', () => {
    const { creditMemos: _c, refunds: _r, ...older } = customerPayload.data;
    const s = statementSerializer({ data: { ...older, totals: { invoiced: '1200', received: '500' } } })!;
    expect(s.lines.map(l => l.label)).toEqual(['Invoice', 'Payment']);
    expect(s.totalCredited).toBe(0);
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
    expect(html).toContain('Credit memos');
    expect(html).toContain('Refunds paid');
  });

  it('speaks of bills and vendor credits on a vendor statement', () => {
    const s = vendorStatementSerializer({
      data: {
        vendor: { id: 'v1', name: 'Habib Oil Mills', email: '' },
        period: { startDate: '2026-03-01', endDate: '2026-03-31' },
        openingBalance: 0,
        bills: [{ id: 'b1', billNumber: 'B-9', billDate: '2026-03-02', total: '5000' }],
        payments: [{ id: 'p1', reference: 'CHQ 1', paymentDate: '2026-03-20', totalAmount: '1000' }],
        vendorCredits: [{ id: 'c1', vendorCreditNumber: 'VC-3', date: '2026-03-09', total: '800' }],
        totals: { billed: '5000', paid: '1000', credited: '800' },
        closingBalance: '3200',
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
