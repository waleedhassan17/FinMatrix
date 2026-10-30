jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { accountMovementSerializer, accountRegisterSerializer } from '../accountRegisterSerializer';
import { arAgingSerializer } from '../arAgingSerializer';
import { balanceSheetSerializer, retainedEarningsSerializer } from '../balanceSheetSerializer';
import { cashFlowLineEntriesSerializer, cashFlowSerializer } from '../cashFlowSerializer';
import { datedValuationSerializer, inventoryHealthSerializer } from '../inventoryHealthSerializer';
import { financialHealthSerializer } from '../kpiSerializer';
import { ownerCockpitSerializer } from '../ownerCockpitSerializer';
import { trialBalanceSerializer } from '../trialBalanceSerializer';
import { balanceSheetSections } from '../../models/balanceSheetModel';
import { trialBalanceSections } from '../../models/trialBalanceModel';
import { HERO_KPIS, pickKpis } from '../../models/ownerCockpitModel';
import { registerTies } from '../../models/accountRegisterModel';
import { formatKpiValue } from '../../models/kpiModel';
import { insightTarget } from '../../models/insightModel';
import { balanceSheetDoc } from '../../screens/Reports/BalanceSheet/balanceSheetDoc';
import { trialBalanceDoc } from '../../screens/Reports/TrialBalance/trialBalanceDoc';
import { cashFlowDoc } from '../../screens/Reports/CashFlow/cashFlowDoc';

import bsC from './fixtures/captured/balanceSheet.captured.json';
import reC from './fixtures/captured/retainedEarnings.captured.json';
import fhC from './fixtures/captured/financialHealth.captured.json';
import tbClosingC from './fixtures/captured/trialBalance.closing.captured.json';
import tbWorkingC from './fixtures/captured/trialBalance.working.captured.json';
import tbMovementC from './fixtures/captured/trialBalance.movement.captured.json';
import cfC from './fixtures/captured/cashFlow.captured.json';
import cflC from './fixtures/captured/cashFlowLine.captured.json';
import arC from './fixtures/captured/arAging.captured.json';
import apC from './fixtures/captured/apAging.captured.json';
import ihC from './fixtures/captured/inventoryHealth.captured.json';
import ivC from './fixtures/captured/inventoryValuation.asOf.captured.json';
import anC from './fixtures/captured/analytics.captured.json';
import regC from './fixtures/captured/register.captured.json';
import mvC from './fixtures/captured/movement.captured.json';

/**
 * The app's serializers and models over REAL v2 responses, captured from the
 * local API (see fixtures/README.md). The hand-written fixtures pin edge
 * cases; these pin the contract — a field the server renamed or moved fails
 * here, not on a phone. The identities checked are the server's own, read
 * through the app: they prove the app reads the figures it is meant to.
 */
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01);
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((t, x) => t + f(x), 0);

describe('reports v2 — captured responses', () => {
  it('every capture is a 200', () => {
    for (const c of [bsC, reC, fhC, tbClosingC, tbWorkingC, tbMovementC, cfC, cflC, arC, apC, ihC, ivC, anC, regC, mvC]) {
      expect(c._status).toBe(200);
    }
  });

  it('balance sheet: sections in order, totals from the server, A = L + E', () => {
    const r = balanceSheetSerializer(bsC.response)!;
    expect(r.sections.map(s => s.key)).toEqual([
      'cashAndBank', 'receivables', 'inventory', 'otherCurrentAssets',
      'fixedAssets', 'currentLiabilities', 'longTermLiabilities', 'equity',
    ]);
    expect(r.fiscalYearStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.isBalanced).toBe(true);
    near(r.totalAssets, r.totalLiabilitiesAndEquity!);
    expect(r.comparison?.asOfDate).toBe('2026-09-30');
    const display = balanceSheetSections(r);
    const totals = display.flatMap(s => s.data).filter(x => x.kind === 'total' && x.grand);
    expect(totals.map(t => (t.kind === 'total' ? t.label : ''))).toHaveLength(2);
    // Equity keys stay unique even with a synthetic line (accountCode '').
    const keys = display.flatMap(s => s.data.map(x => x.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(balanceSheetDoc(r, display, 'compare', '2026-09-30').columns).toHaveLength(4);
  });

  it('retained earnings rollforward reads', () => {
    const r = retainedEarningsSerializer(reC.response)!;
    expect(r.fiscalYearStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(r.byFiscalYear)).toBe(true);
  });

  it('trial balance: every mode balances, groups read, working columns present', () => {
    for (const c of [tbClosingC, tbWorkingC, tbMovementC]) {
      const r = trialBalanceSerializer(c.response)!;
      expect(r.mode).not.toBeNull();
      near(r.totalDebits, r.totalCredits);
      expect(r.groups.length).toBeGreaterThan(0);
      // Every row lands in a section; nothing is dropped.
      expect(sum(trialBalanceSections(r), s => s.data.length)).toBe(r.rows.length);
    }
    const w = trialBalanceSerializer(tbWorkingC.response)!;
    expect(w.totals).not.toBeNull();
    expect(w.rows.every(row => row.pairs !== null)).toBe(true);
    expect(trialBalanceDoc(w, 'working').columns).toHaveLength(6);
    const closing = trialBalanceSerializer(tbClosingC.response)!;
    expect(closing.rows.some(row => row.synthetic)).toBe(true);
  });

  it('cash flow: sections sum to the change, accounts to ending cash, and it ties', () => {
    const r = cashFlowSerializer(cfC.response)!;
    near(r.operating.total + r.investing.total + r.financing.total, r.netChange);
    near(sum(r.accounts, a => a.ending), r.endingCash);
    expect(r.cashTie?.ties).toBe(true);
    expect([...r.operating.lines, ...r.investing.lines, ...r.financing.lines].every(l => l.lineKey !== null)).toBe(true);
    expect(r.monthlyTrend.every(p => p.endingCash !== null)).toBe(true);
    expect(cashFlowDoc(r, 'indirect').title).toContain('Indirect');
  });

  it('cash-flow line: allocations add up to the line', () => {
    const r = cashFlowLineEntriesSerializer(cflC.response)!;
    expect(r.lineKey).toMatch(/^(op|inv|fin)\./);
    if (r.entries.length === r.total) near(sum(r.entries, e => e.allocatedAmount), r.lineAmount);
  });

  it('aging: insights read, schedule foots to the open total', () => {
    for (const c of [arC, apC]) {
      const r = arAgingSerializer(c.response as any)!;
      expect(r.insights).not.toBeNull();
      near(sum(r.insights!.schedule, s => s.amount), r.insights!.totalOpen);
      near(r.insights!.totalOpen, r.totals.total);
    }
    const ar = arAgingSerializer(arC.response as any)!;
    expect(ar.insights?.dso?.key).toBe('dso');
    const ap = arAgingSerializer(apC.response as any)!;
    expect(ap.insights?.dpo?.key).toBe('dpo');
  });

  it('financial health: every KPI has a unit, a status, and a value only when ok', () => {
    const h = financialHealthSerializer(fhC.response)!;
    expect(h.kpis.map(k => k.key)).toEqual(
      expect.arrayContaining(['cashAndBank', 'workingCapital', 'currentRatio', 'dso', 'runwayMonths']),
    );
    for (const k of h.kpis) {
      expect(k.value === null).toBe(k.status !== 'ok');
      expect(typeof formatKpiValue(k.value, k.unit)).toBe('string');
    }
  });

  it('inventory health and the dated valuation read', () => {
    const h = inventoryHealthSerializer(ihC.response)!;
    expect(h.turnover?.key).toBe('inventoryTurnover');
    expect(h.dio?.key).toBe('dio12');
    expect(h.aging.byLastInbound.map(b => b.key)).toEqual(['d0_30', 'd31_90', 'd91_180', 'd180_plus', 'noMovement']);
    const v = datedValuationSerializer(ivC.response)!;
    expect(v.asOfDate).toBe('2026-06-30');
    expect(v.ledgerTie).not.toBeNull();
  });

  it('cockpit: the series foots to its KPI, every hero and grid KPI is there', () => {
    const d = ownerCockpitSerializer(anC.response)!;
    expect(d.comparisonRange).not.toBeNull();
    const revenue = d.kpis.find(k => k.key === 'revenue')!;
    near(sum(d.series, p => p.revenue), revenue.value!);
    expect(pickKpis(d.kpis, HERO_KPIS)).toHaveLength(HERO_KPIS.length);
    // Every KPI judged by the server; insights at most six, most pressing first,
    // each pointing at a report the app can open.
    expect(d.kpis.every(k => k.assessment !== null)).toBe(true);
    expect(d.insights.length).toBeGreaterThan(0);
    expect(d.insights.length).toBeLessThanOrEqual(6);
    const rank = { negative: 0, warning: 1, positive: 2, neutral: 3 };
    const tones = d.insights.map(i => rank[i.tone]);
    expect([...tones].sort((a, b) => a - b)).toEqual(tones);
    expect(d.insights.every(i => insightTarget(i.report, d.range) !== null)).toBe(true);
    expect(d.salesByCustomer?.label).toBe('invoice basis');
    expect(d.health?.kpis.length).toBeGreaterThan(0);
  });

  it('register: the running balance lands on the closing, and the closing ties', () => {
    const r = accountRegisterSerializer(regC.response)!;
    expect(r.openingBasis).toBe('cumulative');
    expect(r.periodNet).not.toBeNull();
    if (r.entries.length === r.total && r.entries.length > 0) {
      near(r.entries[r.entries.length - 1].runningBalance, r.closingBalance);
      near(r.openingBalance + sum(r.entries, e => e.amount), r.closingBalance);
    }
    expect(registerTies(r, { amount: r.closingBalance, basis: 'closing' })).toBe(true);
    expect(registerTies(r, { amount: r.periodNet!, basis: 'movement' })).toBe(true);
  });

  it('movement: the counterparty split adds up to the change', () => {
    const m = accountMovementSerializer(mvC.response)!;
    near(sum(m.byCounterparty, x => x.change), m.change);
    near(sum(m.bySourceType, x => x.change), m.change);
  });
});
