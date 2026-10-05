// ═══════════════════════════════════════════════════════
// FinMatrix — bank accounts the app can make, fix and pay through
// ═══════════════════════════════════════════════════════
// The account form could not create anything (it sent `code`, `balance` and
// `subType: 'current_asset'`), a bank saved as an expense never showed up in
// Pay from with nothing to say why, and a tax payment was refused for missing
// fields. These pin the fixes.

import {
  accountCreatePayload,
  accountUpdatePayload,
  structureFromDetail,
  suggestAccountNumbers,
  SUB_TYPE_OPTIONS,
  validateAccount,
  type COAApiAccount,
  type COAFormData,
} from '../coaModel';
import {
  describeAccountKind,
  isMoneyAccount,
  misfiledMoneyAccounts,
  moneyAccountLabel,
  suggestedMoneyKind,
} from '../moneyAccountModel';
import { quarterLabel, taxPaymentPayload, validateTaxPayment } from '../taxModel';
import { coaSingleSerializer } from '../../serializers/coaSerializer';

const account = (over: Partial<COAApiAccount>): COAApiAccount => ({
  id: 'a',
  companyId: 'co',
  code: '1000',
  name: 'Cash',
  type: 'asset',
  subType: 'Cash',
  description: '',
  parentId: null,
  isActive: true,
  isSystemAccount: false,
  balance: 0,
  normalBalance: 'debit',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const CHART: COAApiAccount[] = [
  account({ id: 'cash', code: '1000', name: 'Cash', subType: 'Cash', isSystemAccount: true }),
  account({ id: 'bank', code: '1010', name: 'Business Checking', subType: 'Bank', isSystemAccount: true }),
  account({ id: 'ar', code: '1100', name: 'Accounts Receivable', subType: 'Accounts Receivable' }),
  account({ id: 'meezan', code: '5010', name: 'MEEZAN BANK', type: 'expense', subType: 'Other Expense' }),
  account({ id: 'fees', code: '6450', name: 'Bank Charges', type: 'expense', subType: 'Operating' }),
];

const form = (over: Partial<COAFormData> = {}): COAFormData => ({
  code: '1020',
  name: 'MCB Current',
  type: 'asset',
  subTypeLabel: 'Bank',
  parentId: '',
  description: '',
  openingBalance: '',
  isActive: true,
  ...over,
});

describe('the account form speaks the server’s language', () => {
  it('offers the server’s own sub-type labels as the values', () => {
    expect(SUB_TYPE_OPTIONS.asset).toContainEqual({ label: 'Bank', value: 'Bank' });
    expect(SUB_TYPE_OPTIONS.equity.map(o => o.value)).toContain('Opening Balance Equity');
  });

  it('creates with accountNumber, the label and a string opening balance', () => {
    expect(accountCreatePayload(form({ openingBalance: 'Rs 250,000', description: ' Main ' }))).toEqual({
      accountNumber: '1020',
      name: 'MCB Current',
      type: 'asset',
      subType: 'Bank',
      description: 'Main',
      openingBalance: '250000.00',
    });
    // Nothing the server would silently drop, and no zero opening balance.
    const plain = accountCreatePayload(form());
    expect(Object.keys(plain).sort()).toEqual(['accountNumber', 'name', 'subType', 'type']);
  });

  it('edits without the opening balance, and sends type and number only when they change', () => {
    const unchanged = accountUpdatePayload(form({ code: '1010', name: 'HBL Current' }), { type: 'asset', code: '1010' });
    expect(unchanged).toEqual({ name: 'HBL Current', subType: 'Bank', parentId: null, description: '', isActive: true });

    // "MEEZAN BANK" saved as 5010 Other Expense, put right as Asset / Bank 1020.
    const fixed = accountUpdatePayload(form({ name: 'MEEZAN BANK' }), { type: 'expense', code: '5010' });
    expect(fixed).toMatchObject({ type: 'asset', subType: 'Bank', accountNumber: '1020' });
  });

  it('reads the account a create or edit answers with, wrapped or not', () => {
    expect(coaSingleSerializer({ data: { id: 'x', accountNumber: '1020', name: 'MCB', subType: 'Bank' } }).account)
      .toMatchObject({ id: 'x', code: '1020', subType: 'Bank' });
    expect(coaSingleSerializer({ data: { account: { id: 'y', accountNumber: '1030' } } }).account.code).toBe('1030');
  });

  it('reads whether the type and number may still change', () => {
    expect(structureFromDetail({ data: { structure: { editable: true, reason: null } } })).toEqual({ editable: true, reason: null });
    expect(structureFromDetail({ data: {} }).editable).toBe(false);
  });
});

describe('numbers', () => {
  it('suggests 1020 for a second bank — not 1100, which is receivables', () => {
    expect(suggestAccountNumbers('asset', 'Bank', CHART)).toEqual(['1020', '1030', '1040', '1050']);
  });

  it('checks the number against the type’s range, and duplicates on edit too', () => {
    const codes = CHART.map(a => a.code);
    expect(validateAccount(form({ code: '5020' }), codes).code).toMatch(/1000 and 1999/);
    expect(validateAccount(form({ code: '1010' }), codes, { isEdit: true, numberEditable: true }).code)
      .toBe('Account number already exists');
    // A fixed number is not the user's to correct.
    expect(validateAccount(form({ code: '5010' }), codes, { isEdit: true }).code).toBeUndefined();
  });

  it('refuses a sub-type that does not belong to the type', () => {
    expect(validateAccount(form({ subTypeLabel: 'Other Expense' }), []).subTypeLabel).toBeTruthy();
  });
});

describe('money accounts — exactly what the server lets a payment use', () => {
  it('is an active asset of kind Cash or Bank', () => {
    expect(CHART.filter(isMoneyAccount).map(a => a.id)).toEqual(['cash', 'bank']);
    expect(isMoneyAccount(account({ subType: 'Bank', isActive: false }))).toBe(false);
  });

  it('knows a bank by its name, and a bank’s charges are not one', () => {
    expect(suggestedMoneyKind('MEEZAN BANK')).toBe('Bank');
    expect(suggestedMoneyKind('Allied Bank Ltd')).toBe('Bank');
    expect(suggestedMoneyKind('Petty Cash')).toBe('Cash');
    expect(suggestedMoneyKind('Bank Charges')).toBeNull();
    expect(suggestedMoneyKind('MCB Loan')).toBeNull();
  });

  it('names the bank saved as an expense, and says how it is set up', () => {
    expect(misfiledMoneyAccounts(CHART).map(a => a.id)).toEqual(['meezan']);
    expect(describeAccountKind(CHART[3])).toBe('an Expense (Other Expense)');
  });

  it('labels where money went, and a record from before the choice as Cash', () => {
    expect(moneyAccountLabel(CHART, 'bank')).toBe('1010 · Business Checking');
    expect(moneyAccountLabel(CHART, null)).toBe('1000 · Cash');
  });
});

describe('tax payments', () => {
  const tax = {
    taxRateId: 'rate-1',
    amount: '12,000',
    date: '2026-10-05',
    period: '2026-Q4',
    reference: '',
    bankAccountId: 'acct-mcb',
  };

  it('sends exactly the DTO: period, paymentDate, a string amount and the account', () => {
    expect(taxPaymentPayload(tax)).toEqual({
      taxRateId: 'rate-1',
      period: '2026-Q4',
      amount: '12000.00',
      paymentDate: '2026-10-05',
      bankAccountId: 'acct-mcb',
    });
    // No account: the server pays from 1000 Cash, as before.
    expect(taxPaymentPayload({ ...tax, bankAccountId: '' })).not.toHaveProperty('bankAccountId');
  });

  it('labels the quarter and requires a period', () => {
    expect(quarterLabel('2026-10-05')).toBe('2026-Q4');
    expect(quarterLabel('2026-03-31')).toBe('2026-Q1');
    expect(validateTaxPayment({ ...tax, period: ' ' }).period).toBeTruthy();
    expect(validateTaxPayment(tax)).toEqual({});
  });
});
