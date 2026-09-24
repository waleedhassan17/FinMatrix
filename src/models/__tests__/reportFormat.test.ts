import { formatRatio } from '../../components/reports/reportFormat';

/** The same cases as the web's formatRatio test. */
describe('formatRatio', () => {
  it('prints margins to one place, signs a loss, and has nothing to say over zero', () => {
    expect(formatRatio(412, 1000)).toBe('41.2%');
    expect(formatRatio(-31, 1000)).toBe('−3.1%');
    expect(formatRatio(5, 0)).toBe('—');
  });
});
