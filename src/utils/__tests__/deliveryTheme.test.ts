import { DP_BRAND } from '../deliveryTheme';

/**
 * The rider palette's contrast, pinned.
 *
 * `primary` is a brand colour the product owner chose from a screenshot, and it
 * is NOT AA-clean for white body text — 3.45:1 against the 4.5:1 bar. That was
 * a deliberate trade, so this suite does two things:
 *
 *   1. asserts every combination that MUST pass, so a future tweak to the ramp
 *      cannot quietly take the header or the tinted surfaces below AA;
 *   2. records the two known exceptions by name, with their measured ratio, so
 *      nobody reads a green suite as "the palette is accessible".
 *
 * It also fixes the hue. Someone reverting this to the old teal, or nudging it
 * toward a colour that is not the one that was asked for, fails here.
 */

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** WCAG 2.1 relative luminance. */
const luminance = (hex: string): number => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

/** Composite `rgba(r,g,b,a)` over an opaque hex, as the header pills render. */
const over = (rgba: string, bg: string): string => {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  const [R, G, B] = rgb(bg);
  const mix = (f: number, back: number) => Math.round(f * a + back * (1 - a));
  return `#${[mix(r, R), mix(g, G), mix(b, B)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

describe('DP_BRAND contrast', () => {
  it('keeps white legible on the gradient end', () => {
    expect(contrast(DP_BRAND.primaryDark, DP_BRAND.white)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('keeps brand-coloured text legible on white and on the soft tint', () => {
    // Which is why every `color:` in the rider screens uses primaryDark and not
    // primary — the brand green as 13px text on white is 3.45:1.
    expect(contrast(DP_BRAND.primaryDark, DP_BRAND.white)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast(DP_BRAND.primaryDark, DP_BRAND.primarySoft)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('keeps the header pills legible', () => {
    // These were 3.86–4.33:1 on the old teal — below AA before the recolour.
    // The dark-alpha overlays are what fixed them.
    for (const overlay of [DP_BRAND.headerOverlay, DP_BRAND.headerOverlaySolid]) {
      expect(contrast(over(overlay, DP_BRAND.primary), DP_BRAND.white)).toBeGreaterThanOrEqual(
        AA_BODY,
      );
    }
  });

  it('keeps the large header name legible on the brand fill', () => {
    // 28px/800 qualifies as large text, so the 3:1 bar applies here.
    expect(contrast(DP_BRAND.primary, DP_BRAND.white)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it('keeps the soft surface distinct from white, and its border from it', () => {
    expect(contrast(DP_BRAND.primarySoft, DP_BRAND.white)).toBeLessThan(1.3);
    expect(contrast(DP_BRAND.primaryBorder, DP_BRAND.primarySoft)).toBeLessThan(1.3);
  });

  /**
   * ── KNOWN EXCEPTIONS ──────────────────────────────────────────────────
   * White body text directly on `primary` is 3.45:1 and fails AA. The colour
   * was specified from a screenshot and kept for brand fidelity; these two
   * places are the cost, and they are asserted so the number cannot drift
   * without someone noticing:
   *
   *   • the "Pick Up Items" / "Start Delivery" button label, 15px/600
   *   • the "GOOD AFTERNOON" greeting, 11px/600
   *
   * Anything ELSE that puts white text on a brand fill must use primaryDark.
   */
  it('records that white body text on primary is a known AA failure', () => {
    const ratio = contrast(DP_BRAND.primary, DP_BRAND.white);
    expect(ratio).toBeLessThan(AA_BODY); // still the known exception
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE); // and no worse than that
    expect(ratio).toBeCloseTo(3.45, 1);
  });

  it('is the green that was asked for', () => {
    // Pins the hue as well as the value: a revert to the old teal (#0F766E),
    // or a drift to some other green, fails here rather than in review.
    expect(DP_BRAND.primary.toUpperCase()).toBe('#2C9F1C');
    expect(DP_BRAND.primaryDark.toUpperCase()).toBe('#248418');
  });
});
