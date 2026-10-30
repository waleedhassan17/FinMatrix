jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { ownerCockpitSerializer } from '../ownerCockpitSerializer';
import { financialHealthSerializer, kpiFrom } from '../kpiSerializer';
import { HERO_KPIS, pickKpis } from '../../models/ownerCockpitModel';
import v2 from './fixtures/analytics.v2.json';

describe('ownerCockpitSerializer', () => {
  const d = ownerCockpitSerializer({ success: true, data: v2 })!;

  it('reads the period, the server comparison and the monthly series', () => {
    expect(d.range).toEqual({ startDate: '2026-07-01', endDate: '2026-09-30' });
    expect(d.comparisonRange).toEqual({ startDate: '2026-04-01', endDate: '2026-06-30' });
    expect(d.series[0].revenue).toBe(1000);
    expect(d.series[1].netIncome).toBe(-50);
    expect(d.series[2].endingCash).toBeNull();
  });

  it('reads KPIs with their prior and change; a status-null KPI stays null', () => {
    const revenue = d.kpis.find(k => k.key === 'revenue')!;
    expect(revenue).toMatchObject({ value: 3000, prior: 2500, change: 500, changePct: 20, unit: 'money' });
    const runway = d.kpis.find(k => k.key === 'runwayMonths')!;
    expect(runway).toMatchObject({ value: null, status: 'cash_positive', prior: 6.1 });
  });

  it('picks the headline figures in order, skipping any the server left out', () => {
    // This fixture predates grossProfit, netIncome and endingCash as KPIs.
    expect(pickKpis(d.kpis, HERO_KPIS).map(k => k.key)).toEqual(['revenue']);
    // No assessment from an older server: none is guessed.
    expect(d.kpis.every(k => k.assessment === null)).toBe(true);
    expect(d.insights).toEqual([]);
  });

  it('reads sales on the invoice basis, with a name for a nameless customer', () => {
    expect(d.salesByCustomer?.label).toBe('invoice basis');
    expect(d.salesByCustomer?.customers[1].name).toBe('(no customer)');
    expect(d.salesByCustomer?.top5SharePct).toBe(100);
    expect(d.expenseByAccount[1]).toEqual({ accountCode: '', accountName: 'Other', amount: 100, sharePct: null });
    expect(d.budgetVsActual).toBeNull();
    expect(d.health?.kpis[0].key).toBe('currentRatio');
  });

  it('is null for nothing', () => {
    expect(ownerCockpitSerializer(null)).toBeNull();
  });
});

describe('financial health', () => {
  it('reads { asOfDate, kpis } and keeps a null value null', () => {
    const h = financialHealthSerializer({
      success: true,
      data: {
        asOfDate: '2026-10-26',
        kpis: [
          { key: 'debtToEquity', label: 'Debt to equity', value: null, unit: 'ratio', formula: 'Total liabilities ÷ Total equity', inputs: { totalLiabilities: '100', totalEquity: -5 }, asOfDate: '2026-10-26', status: 'negative_equity' },
        ],
      },
    })!;
    expect(h.kpis[0]).toMatchObject({ value: null, status: 'negative_equity', inputs: { totalLiabilities: 100, totalEquity: -5 } });
  });

  it('defaults an unknown unit and derives a missing status', () => {
    expect(kpiFrom({ key: 'x', value: 2, unit: 'parsecs' })).toMatchObject({ unit: 'money', status: 'ok' });
    expect(kpiFrom({ key: 'y', value: null })).toMatchObject({ status: 'no_denominator' });
  });
});
