import { canDonut, foldSlices, formatSliceShare, MAX_SLICES, OTHER_KEY, sliceShare } from '../chartSlicesModel';

const p = (key: string, value: number, count?: number) => ({ key, label: key, value, ...(count !== undefined ? { count } : {}) });

describe('chartSlicesModel — the same rules as the website', () => {
  it('draws parts of a positive whole only', () => {
    expect(canDonut([p('a', 10), p('b', 0)])).toBe(true);
    expect(canDonut([p('a', 10), p('b', -2)])).toBe(false);
    expect(canDonut([])).toBe(false);
  });

  it('keeps the six largest and folds the rest into one grey Other', () => {
    const out = foldSlices(Array.from({ length: 9 }, (_, i) => p(`k${i}`, (i + 1) * 10.25, 2)));
    expect(out).toHaveLength(MAX_SLICES + 1);
    expect(out[0].key).toBe('k8');
    expect(out[6]).toEqual({ key: OTHER_KEY, label: 'Other (3)', value: 61.5, count: 6 });
    expect(foldSlices([p('a', 1), p('b', 3)]).map(s => s.key)).toEqual(['b', 'a']);
  });

  it('takes the server’s share when it sent one, and prints a sliver with a decimal', () => {
    expect(sliceShare({ ...p('a', 1), sharePct: 66.67 }, 3)).toBe(66.67);
    expect(sliceShare(p('a', 1), 4)).toBe(25);
    expect(formatSliceShare(66.67)).toBe('67%');
    expect(formatSliceShare(3.14)).toBe('3.1%');
    expect(formatSliceShare(null)).toBe('—');
  });
});
