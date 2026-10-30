jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { balanceSheetSerializer, retainedEarningsSerializer } from '../balanceSheetSerializer';
import { balanceSheetSections, formatChangePct } from '../../models/balanceSheetModel';
import { balanceSheetDoc } from '../../screens/Reports/BalanceSheet/balanceSheetDoc';
import v2 from './fixtures/balanceSheet.v2.json';

/**
 * The balance sheet the server groups and totals. The app must:
 *   • read every v2 field, numbers as numbers (numeric columns arrive as strings);
 *   • still render a server from before sections — its flat lists;
 *   • place the server's groups and subtotals in statement order, adding nothing.
 */
describe('balanceSheetSerializer', () => {
  it('reads the v2 statement', () => {
    const r = balanceSheetSerializer(v2)!;
    expect(r.fiscalYearStart).toBe('2026-01-01');
    expect(r.totalLiabilitiesAndEquity).toBe(205000);
    expect(r.gap).toBe(0);
    expect(r.sections.map(s => s.key)).toContain('cashAndBank');
    const re = r.sections.find(s => s.key === 'equity')!.lines;
    expect(re.find(l => l.synthetic === 'currentYearEarnings')?.accountCode).toBe('');
    expect(re.find(l => l.accountCode === '3100')?.composite).toEqual({ postedBalance: 5000, priorYearsEarnings: 20000 });
    const cash = r.sections[0].lines[0];
    expect(cash.amount).toBe(50000);
    expect(cash.priorAmount).toBe(40000);
    expect(cash.changePct).toBe(25);
    expect(r.comparison?.asOfDate).toBe('2026-09-30');
  });

  it('reads a v1 statement, every v2 field empty', () => {
    const r = balanceSheetSerializer({
      asOfDate: '2026-10-26',
      assets: [{ accountCode: '1000', accountName: 'Cash', amount: '100.50' }],
      liabilities: [],
      equity: [],
      totalAssets: '100.50',
      totalLiabilities: 0,
      totalEquity: '100.50',
      isBalanced: true,
    })!;
    expect(r.assets[0].amount).toBe(100.5);
    expect(r.assets[0].synthetic).toBeNull();
    expect(r.sections).toEqual([]);
    expect(r.subtotals).toEqual([]);
    expect(r.fiscalYearStart).toBeNull();
    expect(r.totalLiabilitiesAndEquity).toBeNull();
    expect(r.comparison).toBeNull();

    // No sections: the three flat lists, never re-grouped on the device.
    const sections = balanceSheetSections(r);
    expect(sections.map(s => s.title)).toEqual(['Assets', 'Liabilities', 'Equity']);
    expect(sections[1].data[0]).toMatchObject({ kind: 'empty' });
  });

  it('is null for nothing', () => {
    expect(balanceSheetSerializer(null)).toBeNull();
  });

  it('reads the retained-earnings rollforward', () => {
    const r = retainedEarningsSerializer({
      success: true,
      data: {
        fiscalYearStart: '2026-01-01',
        postedTo3100: '5000',
        byFiscalYear: [{ fiscalYear: 2025, startDate: '2025-01-01', endDate: '2025-12-31', netIncome: '20000.00' }],
        total: 25000,
      },
    })!;
    expect(r.byFiscalYear[0]).toEqual({ fiscalYear: '2025', startDate: '2025-01-01', endDate: '2025-12-31', netIncome: 20000 });
    expect(r.total).toBe(25000);
  });
});

describe('balanceSheetSections', () => {
  const r = balanceSheetSerializer(v2)!;
  const sections = balanceSheetSections(r);

  it('lays the server groups under the five phone headings, in order', () => {
    expect(sections.map(s => s.title)).toEqual([
      'Current Assets',
      'Fixed Assets',
      'Current Liabilities',
      'Long-term Liabilities',
      'Equity',
    ]);
  });

  it('closes each block with the server subtotal, never a sum of its own', () => {
    const current = sections[0].data;
    expect(current[0]).toMatchObject({ kind: 'groupHeading', label: 'Cash and Bank' });
    const total = current.find(r => r.kind === 'total' && r.label === 'Total Current Assets');
    expect(total).toMatchObject({ amount: 125000, prior: 110000, grand: false });
    const assets = sections[1].data.find(r => r.kind === 'total' && r.grand);
    expect(assets).toMatchObject({ label: 'TOTAL ASSETS', amount: 205000 });
    const tle = sections[4].data[sections[4].data.length - 1];
    expect(tle).toMatchObject({ label: 'TOTAL LIABILITIES AND EQUITY', amount: 205000, grand: true });
  });

  it('says "None" for an empty block rather than dropping its total', () => {
    const lt = sections[3].data;
    expect(lt[0]).toMatchObject({ kind: 'empty' });
    expect(lt[lt.length - 1]).toMatchObject({ kind: 'total', label: 'Total Liabilities' });
  });

  it('prints a change, or "new" where there was nothing before', () => {
    expect(formatChangePct({ amount: 50, priorAmount: 40, changePct: 25 })).toBe('+25.0%');
    expect(formatChangePct({ amount: 50, priorAmount: 0, changePct: null })).toBe('new');
    expect(formatChangePct({ amount: 50, priorAmount: null, changePct: null })).toBe('');
  });

  it('exports the comparison as columns', () => {
    const doc = balanceSheetDoc(r, sections, 'compare', '2026-09-30');
    expect(doc.columns).toEqual(['26 Oct 2026', '30 Sep 2026', 'Change', 'Change %']);
    const cash = doc.rows.find(x => x.label.startsWith('1000'))!;
    expect(cash.values).toEqual([50000, 40000, 10000, '+25.0%']);
    expect(doc.notes?.[0]).toContain('balanced');
    expect(balanceSheetDoc(r, sections, 'balance', null).columns).toEqual(['Amount']);
  });
});
