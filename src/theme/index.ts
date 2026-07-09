/**
 * FinMatrix theme — single canonical module.
 * - THEME / STATUS_CONFIG / PRIORITY_CONFIG (the design system) live in
 *   ./theme.ts and are re-exported here.
 * - The legacy tokens below (colors, spacing, borderRadius, radius, shadows)
 *   predate THEME and are still consumed by older screens; prefer THEME for
 *   new work. The `typography` export is no longer referenced by any screen.
 */
import { Platform } from 'react-native';

export * from './theme';

export const colors = {
  primary: '#059669',
  primaryLight: '#ECFDF5',
  secondary: '#6554C0',
  secondaryLight: '#EAE6FF',
  success: '#00875A',
  successLight: '#E3FCEF',
  warning: '#FF991F',
  warningLight: '#FFFAE6',
  danger: '#DE350B',
  dangerLight: '#FFEBE6',
  info: '#0065FF',
  infoLight: '#E6F0FF',
  background: '#F4F5F7',
  backgroundAlt: '#FAFBFC',
  cardBg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  textPrimary: '#172B4D',
  textSecondary: '#5E6C84',
  textTertiary: '#8993A4',
  textLight: '#8993A4',
  textDisabled: '#B3BAC5',
  border: '#DFE1E6',
  borderLight: '#EBECF0',
  white: '#FFFFFF',
  overlay: 'rgba(9, 30, 66, 0.54)',
};

const fontFamily = Platform.select({
  android: 'Roboto',
  default: 'System',
})!;

export const typography = {
  fontFamily,
  h1: { fontSize: 28, fontWeight: '700' as const, fontFamily },
  h2: { fontSize: 24, fontWeight: '600' as const, fontFamily },
  h3: { fontSize: 20, fontWeight: '600' as const, fontFamily },
  h4: { fontSize: 18, fontWeight: '500' as const, fontFamily },
  body: { fontSize: 16, fontWeight: '400' as const, fontFamily },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, fontFamily },
  small: { fontSize: 14, fontWeight: '400' as const, fontFamily },
  label: { fontSize: 14, fontWeight: '600' as const, fontFamily },
  button: { fontSize: 16, fontWeight: '600' as const, fontFamily },
  overline: { fontSize: 11, fontWeight: '600' as const, fontFamily },
  caption: { fontSize: 12, fontWeight: '400' as const, fontFamily },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const borderRadius = { sm: 8, md: 12, lg: 16 };
// Stage 1 screens use `radius` (incl. a `full` pill value).
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
};
