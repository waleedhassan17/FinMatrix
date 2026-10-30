import { insightTarget, INSIGHT_REPORT_LABEL } from '../insightModel';

describe('insightTarget', () => {
  const fallback = { startDate: '2026-01-01', endDate: '2026-09-30' };

  it('opens each report on the insight’s own period, as the website does', () => {
    expect(insightTarget({ key: 'profitLoss', params: { startDate: '2026-07-01', endDate: '2026-09-30' } }, fallback)).toEqual({
      screen: 'ProfitLoss',
      params: { range: { startDate: '2026-07-01', endDate: '2026-09-30' } },
    });
    expect(insightTarget({ key: 'cashFlow', params: {} }, fallback)).toEqual({ screen: 'CashFlow', params: { range: fallback } });
    expect(insightTarget({ key: 'balanceSheet', params: { endDate: '2026-09-30' } }, fallback)).toEqual({
      screen: 'BalanceSheet',
      params: { asOfDate: '2026-09-30' },
    });
    expect(insightTarget({ key: 'arAging', params: {} }, fallback)).toEqual({ screen: 'ARAging' });
    expect(insightTarget({ key: 'budgets', params: { budgetId: 'b-1' } }, fallback)).toEqual({
      screen: 'BudgetDetail',
      params: { budgetId: 'b-1' },
    });
  });

  it('leaves a report the app does not have unlinked', () => {
    expect(insightTarget({ key: 'somethingNew', params: {} }, fallback)).toBeNull();
    expect(insightTarget({ key: 'budgets', params: {} }, fallback)).toBeNull();
  });

  it('names each report as the website does', () => {
    expect(INSIGHT_REPORT_LABEL.arAging).toBe('AR Aging');
    expect(INSIGHT_REPORT_LABEL.profitLoss).toBe('Profit & Loss');
  });
});
