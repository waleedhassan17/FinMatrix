jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { arAgingSerializer } from '../arAgingSerializer';
import { filterAgingRows, termsText } from '../../models/arAgingModel';
import v2 from './fixtures/arAging.v2.json';

describe('aging insights (v2)', () => {
  const r = arAgingSerializer(v2 as any)!;

  it('reads insights, the schedule and DSO as a KPI', () => {
    expect(r.insights?.totalOpen).toBe(1500);
    expect(r.insights?.overduePct).toBe(60);
    expect(r.insights?.weightedAvgDaysOverdue).toBe(47.5);
    expect(r.insights?.dso).toMatchObject({ key: 'dso', unit: 'days', value: 38.2, status: 'ok' });
    expect(r.insights?.schedule.map(s => s.key)).toEqual(['overdue', 'd0_7', 'd8_14', 'd15_30', 'd31_60', 'd60_plus']);
    expect(r.insights?.schedule.reduce((t, s) => t + s.amount, 0)).toBe(1500);
  });

  it('reads the party fields, and a limit of zero as no limit', () => {
    const acme = r.rows.find(x => x.customerName === 'Acme')!;
    expect(acme).toMatchObject({ paymentTerms: 'net_30', creditLimit: 800, overLimit: true, creditUsedPct: 125, oldestDueDate: '2026-07-01' });
    const beta = r.rows.find(x => x.customerName === 'Beta')!;
    expect(beta.creditUsedPct).toBeNull();
    expect(beta.lastPaymentDate).toBeNull();
  });

  it('a pre-v2 report has no insights and no party fields', () => {
    const old = arAgingSerializer({ asOfDate: '2026-10-26', rows: [{ customerId: 'c', customerName: 'C', total: 5, current: 5 }], totals: { total: 5, current: 5 } } as any)!;
    expect(old.insights).toBeNull();
    expect(old.rows[0].overLimit).toBe(false);
    expect(old.rows[0].creditUsedPct).toBeNull();
  });

  it('filters to overdue, over limit, and 90+ days by the oldest due date', () => {
    const names = (f: any) => filterAgingRows(r.rows, f, r.buckets, r.asOfDate).map(x => x.customerName);
    expect(names(null)).toEqual(['Acme', 'Beta']);
    expect(names('overdue')).toEqual(['Acme']);
    expect(names('overLimit')).toEqual(['Acme']);
    expect(names('over90')).toEqual(['Acme']);
  });

  it('says payment terms in words', () => {
    expect(termsText('net_30')).toBe('Net 30');
    expect(termsText('due_on_receipt')).toBe('Due on receipt');
    expect(termsText(null)).toBeNull();
  });
});
