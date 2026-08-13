// ═══════════════════════════════════════════════════════
// FinMatrix — Auth design tokens (AUTH_DS)
// ═══════════════════════════════════════════════════════
// THE single token set for the auth + onboarding flow.
//
// SignIn, SignUp, CompanySetup and CreateCompany each carried their own
// near-identical `DS` literal (navy gradient header, green accent, slate
// ramp), while EmailVerification, PendingApproval, CompanyRejected and
// ForgotPassword used the older flat `colors/spacing/typography` exports —
// which is exactly why half the flow looked unfinished next to the other half.
// Those values are lifted here verbatim, so adopting this module is a token
// swap with no visual change to the screens that already looked right.
//
// Colours: FinMatrix navy (#0B1120 → #1E293B) with the green #059669 accent
// the rest of the app uses. Metrics come from THEME (src/theme/theme.ts) so
// auth controls match every other form in the product.

import { THEME } from '../../theme';

export const AUTH_DS = {
  // ── Navy (headers, primary surfaces) ──
  navy900: '#0B1120',
  navy800: '#0F172A',
  navy700: '#1E293B',

  // ── Brand green (CTAs, success, accents) ──
  green500: '#059669',
  green400: '#00875A',
  green300: '#34D399',
  green50: '#ECFDF5',
  greenBorder: '#A7F3D0',

  // ── Slate ramp (text, borders, backgrounds) ──
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',

  // ── Status tones ──
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#DE350B',
  red700: '#B91C1C',
  red900: '#7F1D1D',

  amber50: '#FFFAE6',
  amber100: '#FEF3C7',
  amber500: '#FF991F',
  amber600: '#D97706',
  amber800: '#92400E',

  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue500: '#0065FF',
  blue600: '#2563EB',
  blue800: '#1E40AF',

  white: '#FFFFFF',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },

  shadowSm: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  /** Form-control metrics — the app-wide values, so auth matches every other form. */
  control: {
    height: THEME.form.controlHeight, // 48
    radius: THEME.form.controlRadius, // 10
  },

  /** Every primary/secondary CTA in the auth flow is this tall. */
  buttonHeight: 52,

  font: THEME.typography.fontFamily,

  /** Auth content never stretches past this on a wide web viewport. */
  maxContentWidth: 520,
} as const;

export type AuthTone = 'error' | 'success' | 'info' | 'warning';

/** Banner/pill colour mapping, shared by InlineBanner and StatusPill. */
export const AUTH_TONES: Record<
  AuthTone,
  { bg: string; border: string; fg: string; accent: string; icon: string }
> = {
  error: {
    bg: AUTH_DS.red50,
    border: AUTH_DS.red100,
    fg: AUTH_DS.red900,
    accent: AUTH_DS.red500,
    icon: 'alert-circle',
  },
  success: {
    bg: AUTH_DS.green50,
    border: AUTH_DS.greenBorder,
    fg: '#065F46',
    accent: AUTH_DS.green500,
    icon: 'check-circle',
  },
  info: {
    bg: AUTH_DS.blue50,
    border: AUTH_DS.blue100,
    fg: AUTH_DS.blue800,
    accent: AUTH_DS.blue600,
    icon: 'info',
  },
  warning: {
    bg: AUTH_DS.amber100,
    border: '#FDE68A',
    fg: AUTH_DS.amber800,
    accent: AUTH_DS.amber600,
    icon: 'clock',
  },
};
