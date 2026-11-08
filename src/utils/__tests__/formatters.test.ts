import { formatCurrency, formatQty } from '../formatters';

describe('formatQty', () => {
  it('groups thousands', () => {
    expect(formatQty(12500)).toBe('12,500');
    expect(formatQty(1395316450)).toBe('1,395,316,450');
  });

  it('keeps a fractional quantity without padding it', () => {
    expect(formatQty(2.5)).toBe('2.5');
    expect(formatQty(0.125)).toBe('0.125');
    expect(formatQty(3)).toBe('3');
  });

  it('reads a broken figure as zero rather than NaN', () => {
    expect(formatQty(Number.NaN)).toBe('0');
  });
});

describe('formatCurrency', () => {
  // The inventory summary shows the whole figure, never an abbreviation, so a
  // billion-rupee stock value must come out complete.
  it('formats a billion-rupee value in full', () => {
    expect(formatCurrency(1395316450)).toBe('Rs 1,395,316,450.00');
  });

  it('puts the sign before the currency', () => {
    expect(formatCurrency(-40)).toBe('-Rs 40.00');
  });
});
