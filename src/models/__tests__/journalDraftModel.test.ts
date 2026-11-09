import {
  balancingAmounts,
  draftTotals,
  linesMissingAccount,
  linesToSend,
  sanitizeAmount,
} from '../journalDraftModel';

const line = (debit: string, credit: string) => ({ debit, credit });

describe('draftTotals', () => {
  it('an untouched form is empty, not out of balance', () => {
    expect(draftTotals([line('', ''), line('', '')]).status).toBe('empty');
  });

  it('equal sides balance', () => {
    const t = draftTotals([line('1150000', ''), line('', '1150000')]);
    expect(t).toMatchObject({ debit: 1150000, credit: 1150000, diff: 0, status: 'balanced' });
  });

  it('unequal sides report the difference', () => {
    const t = draftTotals([line('500', ''), line('', '200')]);
    expect(t).toMatchObject({ diff: 300, status: 'unbalanced' });
  });

  it('floating-point dust is not a difference', () => {
    expect(draftTotals([line('0.1', ''), line('0.2', ''), line('', '0.3')]).status).toBe('balanced');
  });

  it('tiny amounts on one side are not balanced, however they round', () => {
    expect(draftTotals([line('', '0.001'), line('', '0.001')]).status).toBe('unbalanced');
    expect(draftTotals([line('0.001', ''), line('', '0.001')]).status).toBe('unbalanced');
  });

  it('half-typed text counts as nothing', () => {
    expect(draftTotals([line('.', ''), line('', 'abc')]).status).toBe('empty');
  });
});

describe('balancingAmounts', () => {
  it('debits ahead: the new line is a credit for the difference', () => {
    expect(balancingAmounts([line('500', ''), line('', '200')])).toEqual({ credit: '300' });
  });

  it('credits ahead: the new line is a debit for the difference', () => {
    expect(balancingAmounts([line('100', ''), line('', '350.5')])).toEqual({ debit: '250.50' });
  });

  it('balanced or empty: the new line starts blank', () => {
    expect(balancingAmounts([line('5', ''), line('', '5')])).toEqual({});
    expect(balancingAmounts([line('', '')])).toEqual({});
  });
});

describe('lines that would be lost', () => {
  const l = (accountId: string, debit: string, credit: string) => ({ accountId, debit, credit });

  it('finds an amount with no account, by line number', () => {
    expect(linesMissingAccount([l('a', '1000', ''), l('b', '', '400'), l('', '', '600')])).toEqual([3]);
  });

  it('a blank line is not a mistake, only an unused one', () => {
    expect(linesMissingAccount([l('a', '5', ''), l('b', '', '5'), l('', '', '')])).toEqual([]);
    expect(linesMissingAccount([l('a', '', ''), l('b', '5', ''), l('c', '', '5')])).toEqual([]);
  });

  it('sends only lines with both an account and an amount', () => {
    const send = linesToSend([l('a', '5', ''), l('', '', '5'), l('c', '', ''), l('d', '', '5')]);
    expect(send.map(x => x.accountId)).toEqual(['a', 'd']);
  });
});

describe('sanitizeAmount', () => {
  it('keeps digits and the first decimal point', () => {
    expect(sanitizeAmount('1,150,000.50')).toBe('1150000.50');
    expect(sanitizeAmount('1.2.3')).toBe('1.23');
    expect(sanitizeAmount('Rs 40')).toBe('40');
  });
});
