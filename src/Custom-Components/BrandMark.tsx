// ═══════════════════════════════════════════════════════
// FinMatrix — the brand mark
// ═══════════════════════════════════════════════════════
// A rounded "m" over a red rule. Drawn as vectors rather than shipped as a PNG
// so it stays sharp at every size it appears, from a 28px tile to a sign-in
// header.
//
// THE GEOMETRY is one stroke of width 20: three stems 40 apart, two arches with
// a centreline radius of 20 (so the counters are exactly half a stroke wide),
// round ends, and the rule beneath. It was fitted to the logo artwork to the
// pixel, and it is the same geometry as FinMatrix-Web's LogoMark and the
// launcher icons under android/app/src/main/res/mipmap-*. Change one, change
// all of them.
//
// COLOUR: the "m" takes `color` so it can sit on a dark ground (pass
// textInverse there); the rule is always the logo's red.

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { THEME } from '../theme';

/** The mark's bounding box, in the units the geometry below is drawn in. */
const BOX_X = -3.86;
const BOX_W = 107.72;
const BOX_H = 91.61;

/** The width-to-height ratio, for callers that size a container around it. */
export const BRAND_MARK_ASPECT = BOX_W / BOX_H;

interface BrandMarkProps {
  /** Width in px. The height follows the mark's proportions. */
  size?: number;
  /** The "m". Defaults to the logo's ink; pass textInverse on a dark ground. */
  color?: string;
}

/**
 * Decorative by default: wherever it stands beside the name "FinMatrix" the
 * name carries the meaning. A caller that shows it alone wraps it in a View
 * with its own accessibilityLabel.
 */
const BrandMark: React.FC<BrandMarkProps> = ({
  size = 40,
  color = THEME.colors.brandInk,
}) => (
  <Svg
    width={size}
    height={size / BRAND_MARK_ASPECT}
    viewBox={`${BOX_X} 0 ${BOX_W} ${BOX_H}`}
    accessible={false}
    importantForAccessibility="no-hide-descendants"
  >
    <Path
      d="M10 62.36V30a20 20 0 0 1 40 0v32.36M50 30a20 20 0 0 1 40 0v32.36"
      stroke={color}
      strokeWidth={20}
      strokeLinecap="round"
      fill="none"
    />
    <Rect
      x={BOX_X}
      y={79.25}
      width={BOX_W}
      height={12.36}
      rx={6.18}
      fill={THEME.colors.brandRed}
    />
  </Svg>
);

export default BrandMark;
