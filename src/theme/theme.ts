// ═══════════════════════════════════════════════════════
// FinMatrix — Global Design System (THEME)
// ═══════════════════════════════════════════════════════
// A single source of truth for colour, type, elevation and shape.
// Re-skinning these tokens re-skins every screen that consumes them.
//
// System philosophy (enterprise / production):
//   • A cool slate neutral ramp gives the UI a calm, professional base.
//   • Brand teal is reserved for identity & primary actions (see DP_BRAND).
//   • Semantic colours each ship in three tiers — base / light / lighter —
//     so a coloured icon, its tinted chip, and a faint section background
//     always come from the same family and pass AA contrast on white.
//   • Elevation is soft and layered (low opacity, cool shadow) rather than
//     hard drop shadows, which is what separates "enterprise" from "demo".
//   • Type scale is deliberate: tight tracking on display/headings,
//     comfortable line-height on body, uppercase utility for overlines.

import { Platform, TextStyle, ViewStyle } from 'react-native';

// ───────────────────────────────────────────────
// 1. Raw palette
// ───────────────────────────────────────────────
const palette = {
  // Neutral — cool slate ramp (the backbone of the UI)
  neutral25: '#FCFCFD',
  neutral50: '#F7F9FB',
  neutral100: '#EEF2F6',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',

  // Brand teal (mirrors DP_BRAND so generic primary UI stays on-brand)
  teal700: '#0F766E',
  teal600: '#0E8C80',
  tealDark: '#0B544E',
  tealLight: '#C5E4DF',
  tealLighter: '#E9F4F2',

  // Secondary — violet (used for distinct, non-state categories)
  violet600: '#7C3AED',
  violetLight: '#EFE9FD',

  // Emerald — the app's create/confirm action colour. Off the slate/teal
  // ramp, but load-bearing: it paints every "New"/"Add" pill (THEME.form.
  // addPill) and the form section dots across ~28 screens. Named here so
  // those specs stop carrying a magic hex; the rendered colour is unchanged.
  emerald600: '#059669',
  emerald700: '#047857',
  emeraldLighter: '#ECFDF5',

  // On-dark accents. The ramps above are tuned for white grounds and go muddy
  // on the near-black summary panel, so its two accents are named separately.
  amber400: '#F59E0B',
  emerald400: '#34D399',

  // Semantic — success / warning / danger / info
  green600: '#16A34A',
  greenLight: '#D8F3E1',
  greenLighter: '#EFFBF3',

  amber600: '#D97706',
  amberLight: '#FBEAD0',
  amberLighter: '#FDF6EA',

  red600: '#DC2626',
  redLight: '#FBDCDC',
  redLighter: '#FDF0F0',

  blue600: '#2563EB',
  blueLight: '#DCE7FE',
} as const;

// ───────────────────────────────────────────────
// 2. Semantic colour tokens
// ───────────────────────────────────────────────
const colors = {
  // Brand / primary
  primary: palette.teal700,
  primaryLight: palette.tealLight,
  primaryLighter: palette.tealLighter,
  primaryDark: palette.tealDark,

  // Secondary
  secondary: palette.violet600,
  secondaryLight: palette.violetLight,

  // Create/confirm action green (see palette.emerald600) — distinct from
  // `primary`, which is brand teal. Both are live in the UI today.
  actionGreen: palette.emerald600,
  actionGreenDark: palette.emerald700,
  actionGreenLighter: palette.emeraldLighter,

  // Success
  success: palette.green600,
  successLight: palette.greenLight,
  successLighter: palette.greenLighter,

  // Warning
  warning: palette.amber600,
  warningLight: palette.amberLight,
  warningLighter: palette.amberLighter,

  // Danger
  danger: palette.red600,
  dangerLight: palette.redLight,
  dangerLighter: palette.redLighter,

  // Info
  info: palette.blue600,
  infoLight: palette.blueLight,

  // Neutrals (exposed for direct use)
  neutral25: palette.neutral25,
  neutral50: palette.neutral50,
  neutral100: palette.neutral100,
  neutral200: palette.neutral200,
  neutral300: palette.neutral300,
  neutral400: palette.neutral400,
  neutral500: palette.neutral500,
  neutral600: palette.neutral600,
  neutral700: palette.neutral700,
  neutral800: palette.neutral800,
  neutral900: palette.neutral900,

  // Surfaces
  background: '#F4F6F9', // app canvas — faint cool tint, not pure white
  surface: '#FFFFFF', // cards / sheets
  border: '#E4E9EF', // standard hairline
  borderLight: '#EEF2F6', // subtle internal dividers
  overlay: 'rgba(15, 23, 42, 0.55)', // modal scrim

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',

  // ───────────────────────────────────────────────
  // Backward compatibility tokens (preserved)
  // ───────────────────────────────────────────────
  primaryHover: palette.teal600,
  successHover: '#15803d',
  dangerHover: '#b91c1c',
  warningHover: '#b45309',
  neutral0: '#FFFFFF',
  backgroundAlt: '#FCFCFD',
  surfaceHover: '#FCFCFD',
  borderFocus: palette.teal600,
  textLink: palette.teal700,
  overlayLight: 'rgba(15, 23, 42, 0.15)',
} as const;

// ───────────────────────────────────────────────
// 3. Typography scale
// ───────────────────────────────────────────────
const fontFamily = Platform.select({
  android: 'Roboto',
  default: 'System',
})!;

const typography = {
  fontFamily,

  displayLg: { fontFamily, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -0.5 },
  displayMd: { fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  displaySm: { fontFamily, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },

  h1: { fontFamily, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontFamily, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontFamily, fontSize: 19, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  h4: { fontFamily, fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: -0.1 },
  h5: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },

  bodyLg: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodyMd: { fontFamily, fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  bodySm: { fontFamily, fontSize: 13, lineHeight: 19, fontWeight: '400', letterSpacing: 0 },

  labelLg: { fontFamily, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  labelMd: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1 },
  labelSm: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.1 },

  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.1 },
  overline: { fontFamily, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const satisfies Record<string, TextStyle | string>;

// ───────────────────────────────────────────────
// 4. Shape (radii)
// ───────────────────────────────────────────────
const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
} as const;

// ───────────────────────────────────────────────
// 5. Elevation (soft, layered, cool)
// ───────────────────────────────────────────────
const shadows = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 9,
  },
  // ───────────────────────────────────────────────
  // Backward compatibility shadow (preserved)
  // ───────────────────────────────────────────────
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 38,
    elevation: 12,
  },
} as const satisfies Record<string, ViewStyle>;

// ───────────────────────────────────────────────
// Spacing (preserved for backward compatibility)
// ───────────────────────────────────────────────
const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 48,
} as const;

// ───────────────────────────────────────────────
// 5b. Form-control tokens (ux.md consistency pass)
// ───────────────────────────────────────────────
// THE single source for form-control metrics. Every form primitive
// (CustomInput, CustomDropdown, DateField, FormUI.*) and every inline
// line-editor field reads these — screens must not hardcode control
// heights, radii, or the Add-pill spec.
const form = {
  /** Height of every single-line text input, dropdown trigger, date field. */
  controlHeight: 48,
  /** Corner radius of every form control (matches CustomInput/CustomDropdown). */
  controlRadius: 10,
  /** Height/spec of the green "Add" pill — identical everywhere it appears. */
  addPill: {
    background: colors.actionGreen,
    radius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700' as const,
    iconSize: 15,
  },
  /** Section header: dot + 11px uppercase letter-spaced title (doc-form style). */
  sectionTitle: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.neutral500,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  sectionDot: { size: 8, color: colors.actionGreen },
  /**
   * The dark "summary / totals" panel that closes every transaction form.
   * All five forms drew this panel from their own local palette; the spec
   * lives here so the gradient, the label/value contrast and the two on-dark
   * accents are identical across Invoice, Bill, PO, PayBills and
   * ReceivePayment.
   */
  summaryPanel: {
    gradient: [colors.neutral900, colors.neutral800] as [string, string],
    /** Figures and headings on the panel. */
    text: colors.neutral100,
    /** Row labels — deliberately dimmer than the values beside them. */
    label: 'rgba(238, 242, 246, 0.65)',
    /** Hairline rule between rows. */
    divider: 'rgba(238, 242, 246, 0.14)',
    /** The "gold" accent: panel icon and grand total. */
    accent: palette.amber400,
    /** A credit or discount — money coming back off the total. */
    positive: palette.emerald400,
  },
} as const;

// ───────────────────────────────────────────────
// 6. Public theme object
// ───────────────────────────────────────────────
export const THEME = {
  colors,
  typography,
  radius,
  shadows,
  spacing,
  form,
} as const;

export type Theme = typeof THEME;

// ───────────────────────────────────────────────
// 7. Delivery status configuration
// ───────────────────────────────────────────────
export interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

export const STATUS_CONFIG: Record<string, StatusStyle> = {
  pending: { label: 'Pending', color: colors.primary, bg: colors.primaryLighter, icon: 'clock' },
  picked_up: { label: 'Picked Up', color: colors.secondary, bg: colors.secondaryLight, icon: 'package' },
  in_transit: { label: 'In Transit', color: colors.warning, bg: colors.warningLight, icon: 'truck' },
  arrived: { label: 'Arrived', color: colors.info, bg: colors.infoLight, icon: 'map-pin' },
  delivered: { label: 'Delivered', color: colors.success, bg: colors.successLight, icon: 'check-circle' },
  failed: { label: 'Failed', color: colors.danger, bg: colors.dangerLight, icon: 'x-circle' },
  cancelled: { label: 'Cancelled', color: colors.neutral500, bg: colors.neutral100, icon: 'slash' },
  returned: { label: 'Returned', color: colors.secondary, bg: colors.secondaryLight, icon: 'corner-up-left' },
  unassigned: { label: 'Unassigned', color: colors.neutral500, bg: colors.neutral100, icon: 'help-circle' },
};

// ───────────────────────────────────────────────
// 8. Priority configuration
// ───────────────────────────────────────────────
export interface PriorityStyle {
  label: string;
  color: string;
  bg: string;
}

export const PRIORITY_CONFIG: Record<string, PriorityStyle> = {
  low: { label: 'Low', color: colors.success, bg: colors.successLight },
  medium: { label: 'Medium', color: colors.warning, bg: colors.warningLight },
  high: { label: 'High', color: colors.danger, bg: colors.dangerLight },
  urgent: { label: 'Urgent', color: '#FFFFFF', bg: colors.danger },
};

export default THEME;
