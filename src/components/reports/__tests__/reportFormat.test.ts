import { parenNegative } from '../reportFormat';
import { formatCurrency } from '../../../utils/formatters';

/**
 * The sign convention behind every statement figure. A broken one misreads a
 * loss as a profit. (Which section an account belongs to is the server's call
 * now — classifyForStatement — so the app no longer classifies anything.)
 */

describe('parenNegative', () => {
  it('wraps negatives in parentheses instead of using a minus', () => {
    expect(parenNegative(-1234)).toBe('(Rs 1,234.00)');
  });

  it('leaves positives plain', () => {
    expect(parenNegative(1234)).toBe('Rs 1,234.00');
  });

  it('renders zero without parentheses', () => {
    expect(parenNegative(0)).toBe('Rs 0.00');
    // -0 is still zero, and must not read as "(Rs 0.00)".
    expect(parenNegative(-0)).toBe('Rs 0.00');
  });

  it('honours a custom currency prefix', () => {
    expect(parenNegative(-50, '$')).toBe('($50.00)');
  });

  it('rounds exactly like formatCurrency, so statements and tiles agree', () => {
    for (const n of [0.005, 1234.567, 99999.994, 1e6]) {
      expect(parenNegative(n)).toBe(formatCurrency(n));
      expect(parenNegative(-n)).toBe(`(${formatCurrency(n)})`);
    }
  });

  it('treats a non-finite amount as zero rather than printing NaN', () => {
    expect(parenNegative(Number.NaN)).toBe('Rs 0.00');
    expect(parenNegative(Number.POSITIVE_INFINITY)).toBe('Rs 0.00');
  });
});
