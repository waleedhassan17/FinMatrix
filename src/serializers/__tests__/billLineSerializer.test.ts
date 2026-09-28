// Postgres `numeric` arrives as a STRING. The bill line mapper accepted
// numbers only, so every line read amount 0, quantity 1 and tax 0% — the bill
// screen showed Rs 0.00 lines under a real subtotal, and editing a draft bill
// loaded its lines as zeros.
import { billSingleSerializer } from '../billSerializer';

const bill = (lines: object[]) => ({
  success: true,
  data: {
    id: 'b1',
    billNumber: 'WC-PB-0',
    vendorId: 'v1',
    vendorName: 'Habib Oil Mills',
    status: 'open',
    total: '88000.0000',
    amountPaid: '0.0000',
    lines,
  },
});

describe('bill lines from the API', () => {
  it('reads string amounts, quantities and tax rates', () => {
    const b = billSingleSerializer(
      bill([{ id: 'l1', accountId: 'a1', description: 'Cooking Oil 5L', quantity: '40.0000', unitCost: null, amount: '72000.0000', taxRate: '17.0000' }]),
    )!;
    expect(b.lines[0]).toMatchObject({ quantity: 40, amount: 72000, taxRate: 17, unitPrice: 1800 });
    expect(b.vendorName).toBe('Habib Oil Mills');
  });

  it('still reads plain numbers', () => {
    const b = billSingleSerializer(bill([{ id: 'l1', quantity: 2, unitPrice: 50, amount: 100, taxRate: 0 }]))!;
    expect(b.lines[0]).toMatchObject({ quantity: 2, unitPrice: 50, amount: 100, taxRate: 0 });
  });

  it('a line with no quantity is one of its amount', () => {
    const b = billSingleSerializer(bill([{ id: 'l1', amount: '250.5000', taxRate: '0' }]))!;
    expect(b.lines[0]).toMatchObject({ quantity: 1, unitPrice: 250.5, amount: 250.5 });
  });
});
