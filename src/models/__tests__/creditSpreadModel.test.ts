// The same rule as the web app's spreadCredits (src/models/allocation.ts there):
// a payment has to settle the same documents from the same credits on both.
import {
  creditSourcesFromSummary,
  fillCredits,
  isCreditOverUsed,
  spreadCredits,
  type CreditSource,
} from '../creditSpreadModel';

const credit = (id: string, available: number, use: string, kind: CreditSource['kind'] = 'advance'): CreditSource => ({
  id,
  kind,
  reference: `REF-${id}`,
  date: '2026-08-01',
  available,
  use,
});

describe('spreadCredits', () => {
  it('spends credit on the first document before the next', () => {
    const s = spreadCredits(
      [
        { documentId: 'overdue', cap: 1000 },
        { documentId: 'current', cap: 500 },
      ],
      [credit('adv', 300, '300')],
    );
    expect(s.pieces).toEqual([{ creditId: 'adv', kind: 'advance', documentId: 'overdue', amount: 300 }]);
    expect(s.perDocument).toEqual({ overdue: 300 });
    expect(s.used).toBe(300);
  });

  it('spills a credit onto the next document once the first is covered', () => {
    const s = spreadCredits(
      [
        { documentId: 'a', cap: 200 },
        { documentId: 'b', cap: 500 },
      ],
      [credit('memo', 350, '350', 'credit_memo')],
    );
    expect(s.pieces).toEqual([
      { creditId: 'memo', kind: 'credit_memo', documentId: 'a', amount: 200 },
      { creditId: 'memo', kind: 'credit_memo', documentId: 'b', amount: 150 },
    ]);
  });

  it('uses credits in the order given', () => {
    const s = spreadCredits([{ documentId: 'a', cap: 1000 }], [credit('adv', 300, '300'), credit('memo', 200, '200')]);
    expect(s.perCredit).toEqual({ adv: 300, memo: 200 });
    expect(s.used).toBe(500);
  });

  it('never lands more on a document than its cap', () => {
    const s = spreadCredits([{ documentId: 'a', cap: 120 }], [credit('adv', 500, '500')]);
    expect(s.perDocument).toEqual({ a: 120 });
    expect(s.used).toBe(120);
  });

  it('never spends more of a credit than it holds, whatever was typed', () => {
    expect(spreadCredits([{ documentId: 'a', cap: 1000 }], [credit('adv', 250, '900')]).used).toBe(250);
  });

  it('ignores a blank, zero or negative use', () => {
    const s = spreadCredits(
      [{ documentId: 'a', cap: 1000 }],
      [credit('x', 100, ''), credit('y', 100, '0'), credit('z', 100, '-50')],
    );
    expect(s.pieces).toEqual([]);
    expect(s.used).toBe(0);
  });

  it('keeps paisa exact', () => {
    const s = spreadCredits(
      [
        { documentId: 'a', cap: 0.1 },
        { documentId: 'b', cap: 0.2 },
      ],
      [credit('adv', 0.3, '0.3')],
    );
    expect(s.pieces.map(p => p.amount)).toEqual([0.1, 0.2]);
    expect(s.used).toBe(0.3);
  });
});

describe('helpers', () => {
  it('fillCredits sets every credit to use all it holds', () => {
    expect(fillCredits([credit('a', 1250.5, ''), credit('b', 99.999, '10')]).map(c => c.use)).toEqual(['1250.5', '100']);
  });

  it('isCreditOverUsed flags a credit set above what it holds', () => {
    expect(isCreditOverUsed([credit('a', 100, '100')])).toBe(false);
    expect(isCreditOverUsed([credit('a', 100, '100.01')])).toBe(true);
  });

  it('reads the summary: receipts are advances, spent credits are left out', () => {
    const sources = creditSourcesFromSummary(
      [
        { kind: 'payment', id: 'r1', reference: 'RCT-1', date: '2026-07-01', available: 300 },
        { kind: 'credit_memo', id: 'c1', reference: 'CM-1', date: '2026-07-02', available: 200 },
        { kind: 'payment', id: 'r0', reference: 'RCT-0', date: '2026-06-01', available: 0 },
      ],
      'customer',
    );
    expect(sources.map(s => [s.id, s.kind, s.use])).toEqual([
      ['r1', 'advance', '300'],
      ['c1', 'credit_memo', '200'],
    ]);
    expect(
      creditSourcesFromSummary([{ kind: 'vendor_credit', id: 'v1', reference: 'VC-1', date: '', available: 50 }], 'vendor')[0]
        .kind,
    ).toBe('vendor_credit');
  });
});
