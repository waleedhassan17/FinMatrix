jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { cashFlowLineEntriesSerializer, cashFlowSerializer } from '../cashFlowSerializer';
import { allocationNote } from '../../models/cashFlowModel';
import { cashFlowDoc } from '../../screens/Reports/CashFlow/cashFlowDoc';
import v2 from './fixtures/cashFlow.v2.json';

describe('cashFlowSerializer', () => {
  it('reads line keys, accounts, the ending-cash series and the tie', () => {
    const r = cashFlowSerializer(v2)!;
    expect(r.operating.lines[0]).toEqual({
      label: 'Cash received from customers',
      amount: 90000,
      lineKey: 'op.customers',
      section: 'operating',
    });
    expect(r.investing.lines[0].lineKey).toBe('inv.fixed_assets');
    expect(r.monthlyTrend[2]).toEqual({ label: 'Mar 26', value: 25000, endingCash: 50000 });
    expect(r.accounts).toHaveLength(2);
    expect(r.cashTie).toEqual({ endingCash: 50000, balanceSheetCash: 50000, ties: true });
    expect(r.operatingIndirect?.excludedNonCash[0].amount).toBe(8000);
    // An indirect adjustment is not a set of cash postings: no key, no drill.
    expect(r.operatingIndirect?.adjustments[0].lineKey).toBeNull();
  });

  it('reads a pre-v2 statement without line keys, accounts or tie', () => {
    const r = cashFlowSerializer({
      range: { startDate: '2026-01-01', endDate: '2026-01-31' },
      operating: { lines: [{ label: 'Other cash movements', amount: 5 }], total: 5 },
      investing: { lines: [], total: 0 },
      financing: { lines: [], total: 0 },
      netChange: 5,
      beginningCash: 0,
      endingCash: 5,
      monthlyTrend: [{ label: 'Jan 26', value: 5 }],
    })!;
    expect(r.operating.lines[0].lineKey).toBeNull();
    expect(r.monthlyTrend[0].endingCash).toBeNull();
    expect(r.accounts).toEqual([]);
    expect(r.cashTie).toBeNull();
    expect(r.operatingIndirect).toBeNull();
  });

  it('exports the direct and the indirect statement', () => {
    const r = cashFlowSerializer(v2)!;
    const direct = cashFlowDoc(r, 'direct');
    expect(direct.rows.find(x => x.label === 'Cash paid to suppliers')?.values).toEqual([-40000]);
    const indirect = cashFlowDoc(r, 'indirect');
    expect(indirect.title).toContain('Indirect');
    expect(indirect.rows.find(x => x.label === 'Net income')?.values).toEqual([45000]);
    expect(indirect.notes?.[0]).toContain('equals the balance sheet');
  });
});

describe('cashFlowLineEntriesSerializer', () => {
  it('reads each posting with the part this line took', () => {
    const r = cashFlowLineEntriesSerializer({
      success: true,
      data: {
        lineKey: 'inv.fixed_assets',
        label: 'Purchase / sale of fixed assets',
        section: 'investing',
        range: { startDate: '2026-01-01', endDate: '2026-12-31' },
        lineAmount: -4000,
        entries: [
          {
            id: 'g1', date: '2026-02-01', reference: 'BP-1', memo: '', debit: 0, credit: 5000, amount: -5000,
            sourceType: 'bill_payment', sourceId: 'bp1', sourceLabel: 'Bill payment', documentNumber: 'BP-1',
            counterpartyName: 'Machines Ltd', cashAccountCode: '1010', cashAccountName: 'Bank',
            allocatedAmount: '-4000.00', allocationPct: 80,
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      },
    })!;
    expect(r.entries[0]).toMatchObject({ amount: -5000, allocatedAmount: -4000, allocationPct: 80, cashAccountCode: '1010' });
    expect(allocationNote(r.entries[0])).toBe('80% of payment');
    expect(allocationNote({ allocationPct: 100 })).toBeNull();
  });

  it('treats a posting from a server that does not split as whole', () => {
    const r = cashFlowLineEntriesSerializer({ lineKey: 'op.other', entries: [{ id: 'x', amount: 12 }] })!;
    expect(r.entries[0].allocatedAmount).toBe(12);
    expect(r.entries[0].allocationPct).toBe(100);
  });
});
