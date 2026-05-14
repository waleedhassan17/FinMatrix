/**
 * FinMatrix Enterprise Design System
 * Professional theme tokens for QuickBooks/PeachTree competitor
 */

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  android: 'Roboto',
  default: 'System',
})!;

export const THEME = {
  colors: {
    // Primary Brand
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#ECFDF5',
    primaryLighter: '#F0FDF4',
    
    // Secondary
    secondary: '#6554C0',
    secondaryLight: '#EAE6FF',
    
    // Success
    success: '#00875A',
    successHover: '#006644',
    successLight: '#E3FCEF',
    successLighter: '#F4FFF9',
    
    // Danger
    danger: '#DE350B',
    dangerHover: '#BF2600',
    dangerLight: '#FFEBE6',
    dangerLighter: '#FFF5F3',
    
    // Warning
    warning: '#FF991F',
    warningHover: '#FF8B00',
    warningLight: '#FFFAE6',
    warningLighter: '#FFFCF0',
    
    // Info
    info: '#0065FF',
    infoLight: '#E6F0FF',
    
    // Neutrals (Refined Gray Scale)
    neutral900: '#091E42',
    neutral800: '#172B4D',
    neutral700: '#253858',
    neutral600: '#344563',
    neutral500: '#5E6C84',
    neutral400: '#8993A4',
    neutral300: '#B3BAC5',
    neutral200: '#DFE1E6',
    neutral100: '#EBECF0',
    neutral50: '#F4F5F7',
    neutral25: '#FAFBFC',
    neutral0: '#FFFFFF',
    
    // Semantic
    background: '#F4F5F7',
    backgroundAlt: '#FAFBFC',
    surface: '#FFFFFF',
    surfaceHover: '#F4F5F7',
    border: '#DFE1E6',
    borderLight: '#EBECF0',
    borderFocus: '#34D399',
    
    // Text
    textPrimary: '#172B4D',
    textSecondary: '#5E6C84',
    textTertiary: '#8993A4',
    textDisabled: '#B3BAC5',
    textInverse: '#FFFFFF',
    textLink: '#059669',
    
    // Overlay
    overlay: 'rgba(9, 30, 66, 0.54)',
    overlayLight: 'rgba(9, 30, 66, 0.14)',
  },
  
  shadows: {
    xs: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 1,
      elevation: 1,
    },
    sm: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    xxl: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 16,
    },
  },
  
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    full: 9999,
  },
  
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    xxxxl: 48,
  },
  
  typography: {
    fontFamily,

    // Display
    displayLg: {
      fontFamily,
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
    displayMd: {
      fontFamily,
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    displaySm: {
      fontFamily,
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    
    // Headings
    h1: {
      fontFamily,
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    h2: {
      fontFamily,
      fontSize: 20,
      fontWeight: '700' as const,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    h3: {
      fontFamily,
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    h4: {
      fontFamily,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    h5: {
      fontFamily,
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    
    // Body
    bodyLg: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyMd: {
      fontFamily,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySm: {
      fontFamily,
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    
    // Labels
    labelLg: {
      fontFamily,
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    labelMd: {
      fontFamily,
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    labelSm: {
      fontFamily,
      fontSize: 11,
      fontWeight: '600' as const,
      lineHeight: 14,
      letterSpacing: 0.5,
    },
    
    // Caption
    caption: {
      fontFamily,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    
    // Overline
    overline: {
      fontFamily,
      fontSize: 10,
      fontWeight: '700' as const,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
  },
};

// Status configurations for delivery states
export const STATUS_CONFIG = {
  pending: {
    color: THEME.colors.primary,
    bg: THEME.colors.primaryLight,
    label: 'Pending',
    icon: 'clock',
  },
  picked_up: {
    color: THEME.colors.secondary,
    bg: THEME.colors.secondaryLight,
    label: 'Picked Up',
    icon: 'package',
  },
  in_transit: {
    color: THEME.colors.warning,
    bg: THEME.colors.warningLight,
    label: 'In Transit',
    icon: 'truck',
  },
  arrived: {
    color: THEME.colors.info,
    bg: THEME.colors.infoLight,
    label: 'Arrived',
    icon: 'map-pin',
  },
  delivered: {
    color: THEME.colors.success,
    bg: THEME.colors.successLight,
    label: 'Delivered',
    icon: 'check',
  },
  failed: {
    color: THEME.colors.danger,
    bg: THEME.colors.dangerLight,
    label: 'Failed',
    icon: 'x',
  },
  returned: {
    color: THEME.colors.secondary,
    bg: THEME.colors.secondaryLight,
    label: 'Returned',
    icon: 'corner-down-left',
  },
  unassigned: {
    color: THEME.colors.neutral500,
    bg: THEME.colors.neutral100,
    label: 'Unassigned',
    icon: 'minus',
  },
};

// Priority configurations
export const PRIORITY_CONFIG = {
  high: {
    color: THEME.colors.danger,
    bg: THEME.colors.dangerLight,
    label: 'High Priority',
  },
  medium: {
    color: THEME.colors.warning,
    bg: THEME.colors.warningLight,
    label: 'Medium',
  },
  low: {
    color: THEME.colors.success,
    bg: THEME.colors.successLight,
    label: 'Low',
  },
};

export default THEME;
