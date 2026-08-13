// ═══════════════════════════════════════════════════════
// FinMatrix — Auth design tokens
// ═══════════════════════════════════════════════════════
// The auth flow follows the visual conventions of enterprise financial
// software (Stripe, Mercury, Xero, QuickBooks): a calm neutral canvas, one
// accent colour used sparingly, hairline borders instead of heavy shadows,
// left-aligned typography, and a strict 4px spacing grid.
//
// Deliberately absent, because they read as decoration rather than product:
// gradient headers, floating blurred shapes, oversized circular icon badges,
// glowing status pills, emoji iconography, and radii above 12px.
//
// Rule of thumb when extending this file: if a value exists to draw attention
// rather than to communicate state or hierarchy, it does not belong here.

import { Platform } from 'react-native';

const fontFamily = Platform.select({ android: 'Roboto', default: 'System' })!;

// ── Neutral ramp. Carries almost the entire interface. ──
const ink = {
  900: '#0F172A', // headings
  700: '#334155', // body
  600: '#475569', // secondary
  500: '#64748B', // muted / helper
  400: '#94A3B8', // placeholder, disabled
};

const surface = {
  page: '#FFFFFF',
  subtle: '#F8FAFC', // section fills, wide-viewport page behind the panel
  sunken: '#F1F5F9', // inputs on tinted surfaces, skeletons
};

const line = {
  DEFAULT: '#E2E8F0', // hairline borders — the primary separator in this system
  strong: '#CBD5E1', // hover / emphasis
};

// ── Accent. One colour, used for the primary action, focus, and active state.
//    Never for decoration. ──
const brand = {
  DEFAULT: '#059669',
  hover: '#047857',
  subtle: '#ECFDF5',
  border: '#A7F3D0',
};

export const AUTH = {
  font: fontFamily,
  ink,
  surface,
  line,
  brand,

  // ── Status. Low-saturation tints with a hairline border — never a solid
  //    block of colour, which shouts on a financial screen. ──
  status: {
    error: { fg: '#991B1B', bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
    success: { fg: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', accent: '#059669' },
    info: { fg: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
    warning: { fg: '#92400E', bg: '#FFFBEB', border: '#FDE68A', accent: '#D97706' },
  },

  // ── 4px grid. Every margin and pad in the auth flow comes from here. ──
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  // ── Restrained radii. Controls 8, surfaces 12. ──
  radius: { sm: 6, DEFAULT: 8, lg: 12, pill: 999 },

  // ── Type scale. Deliberately few steps, tight tracking on display sizes. ──
  type: {
    display: { fontFamily, fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.4 },
    title: { fontFamily, fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
    body: { fontFamily, fontSize: 15, fontWeight: '400' as const },
    bodyStrong: { fontFamily, fontSize: 15, fontWeight: '600' as const },
    label: { fontFamily, fontSize: 13, fontWeight: '500' as const },
    small: { fontFamily, fontSize: 13, fontWeight: '400' as const },
    caption: { fontFamily, fontSize: 12, fontWeight: '400' as const },
  },

  // ── Controls. One height for every input and button in the flow. ──
  control: { height: 44, radius: 8 },

  /** Auth content column. 400 is the conventional width for a sign-in form. */
  maxWidth: 400,

  /**
   * The only shadow in the system, for the wide-viewport panel. Mobile uses a
   * hairline border instead — a raised card on a phone reads as decoration.
   */
  panelShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;

export type AuthTone = 'error' | 'success' | 'info' | 'warning';

/** Back-compat alias — some screens still import the old name. */
export const AUTH_DS = AUTH;
