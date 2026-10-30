jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { trialBalanceSerializer } from '../trialBalanceSerializer';
import { drCr, flagText, flaggedCount, trialBalanceSections } from '../../models/trialBalanceModel';
import { trialBalanceDoc } from '../../screens/Reports/TrialBalance/trialBalanceDoc';
import working from './fixtures/trialBalance.working.v2.json';

describe('trialBalanceSerializer', () => {
  it('reads the working trial balance: six columns, groups, flags, warnings', () => {
    const r = trialBalanceSerializer(working)!;
    expect(r.mode).toBe('working');
    expect(r.rows[0].pairs).toEqual({
      openingDebit: 40000,
      openingCredit: 0,
      periodDebit: 30000,
      periodCredit: 20000,
      closingDebit: 50000,
      closingCredit: 0,
    });
    expect(r.rows[4].synthetic).toBe(true);
    expect(r.groups[0].pairs?.closingCredit).toBe(500);
    expect(r.balanced).toEqual({ opening: true, period: false, closing: true });
    expect(r.totals?.closingDebit).toBe(61500);
    expect(r.warnings[0].code).toBe('CROSSES_FISCAL_YEAR');
  });

  it('reads the pre-v2 movement shape with every v2 field empty', () => {
    const r = trialBalanceSerializer({
      range: { startDate: '2026-01-01', endDate: '2026-01-31' },
      rows: [{ accountCode: '1000', accountName: 'Cash', debit: '10.00', credit: 0 }],
      totalDebits: 10,
      totalCredits: 10,
      isBalanced: true,
    })!;
    expect(r.mode).toBeNull();
    expect(r.rows[0]).toMatchObject({ debit: 10, flags: [], group: null, pairs: null });
    expect(r.groups).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(trialBalanceSections(r).map(s => s.title)).toEqual(['Accounts']);
  });

  it('is null for nothing', () => {
    expect(trialBalanceSerializer(undefined)).toBeNull();
  });
});

describe('trial balance presentation', () => {
  const r = trialBalanceSerializer(working)!;

  it('groups rows under the server groups, with the server subtotal', () => {
    const s = trialBalanceSections(r);
    expect(s.map(x => x.key)).toEqual(['cashAndBank', 'currentLiabilities', 'equity', 'expenses']);
    expect(s[0].data.map(x => x.accountCode)).toEqual(['1000', '1010']);
    expect(s[0].subtotal?.credit).toBe(500);
  });

  it('filters to flagged rows or a search, and drops the subtotal it would no longer match', () => {
    expect(flaggedCount(r)).toBe(2);
    const flagged = trialBalanceSections(r, { flaggedOnly: true });
    expect(flagged.flatMap(x => x.data.map(d => d.accountCode))).toEqual(['1010', '3900']);
    expect(flagged.every(x => x.subtotal === null)).toBe(true);
    const found = trialBalanceSections(r, { query: 'rent' });
    expect(found).toHaveLength(1);
    expect(found[0].data[0].accountCode).toBe('6000');
  });

  it('says which side a balance sits on', () => {
    expect(drCr(500, 0)).toEqual({ amount: 500, side: 'Dr' });
    expect(drCr(0, 500)).toEqual({ amount: 500, side: 'Cr' });
    expect(drCr(0, 0)).toEqual({ amount: 0, side: null });
  });

  it('explains every flag, and an unknown one plainly', () => {
    expect(flagText('obe_nonzero').title).toMatch(/Opening Balance Equity/);
    expect(flagText('new_flag').title).toBe('new flag');
  });

  it('exports the working columns, landscape-wide', () => {
    const doc = trialBalanceDoc(r, 'working');
    expect(doc.columns).toHaveLength(6);
    expect(doc.rows[doc.rows.length - 1]).toMatchObject({ kind: 'grand', values: [51000, 51000, 30500, 30500, 61500, 61500] });
    expect(doc.notes).toContain('The range runs past the fiscal year that starts 2026-01-01.');
  });
});
