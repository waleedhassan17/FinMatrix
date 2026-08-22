// ═══════════════════════════════════════════════════════
// FinMatrix — Dashboard design tokens
// ═══════════════════════════════════════════════════════
// Shared by AdminDashboardScreen and the cards extracted out of it, so a card
// living in its own file still sits on exactly the same surface, radius and
// ink scale as the ones beside it.

import { THEME } from '../../utils/theme';
import { HEADER_NAVY } from '../../theme';

const T = THEME;

// ── Accounting palette ────────────────────────────────
// Quiet surfaces, dark ink figures, one disciplined brand green. Colour
// appears only as small semantic signals.
//
// These are NAMES for design-system tokens, not values of their own. The
// dashboard's vocabulary (ink / pos / neg) is worth keeping because it reads
// like the domain, but every colour resolves to the same token the rest of the
// app uses -- so "positive" here is the same green as a paid invoice.
export const C = {
  canvas: T.colors.background,
  surface: T.colors.surface,
  line: T.colors.border,
  lineSoft: T.colors.borderLight,
  ink: T.colors.textPrimary,
  ink2: T.colors.textSecondary,
  ink3: T.colors.textTertiary,
  brand: T.colors.primary,
  pos: T.colors.success,
  neg: T.colors.danger,
  warn: T.colors.warning,
  info: T.colors.info,
  indigo: T.colors.secondary,
  teal: T.colors.primary,
  slate: T.colors.textSecondary,
  bar: T.colors.neutral300, // quiet slate for past months in the revenue chart
  navy: HEADER_NAVY,
};

export const FONT = THEME.typography.fontFamily;

/** The card surface every block on the dashboard is drawn on. */
export const card = {
  backgroundColor: C.surface,
  borderRadius: T.radius.xl,
  borderWidth: 1,
  borderColor: C.line,
  shadowColor: T.colors.neutral900,
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;

// ── Compact currency (mirrors slice formatter) ────────
export const compactRs = (n: number): string => {
  if (!Number.isFinite(n)) return 'Rs 0';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${sign}Rs ${(a / 1e9).toFixed(1)}B`;
  if (a >= 1_000_000) return `${sign}Rs ${(a / 1e6).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}Rs ${Math.round(a / 1e3)}K`;
  if (a >= 1_000) return `${sign}Rs ${(a / 1e3).toFixed(1)}K`;
  return `${sign}Rs ${Math.round(a).toLocaleString()}`;
};
