// ═══════════════════════════════════════════════════════
// FinMatrix — Bottom tab label
// ═══════════════════════════════════════════════════════
// A fifth of a phone is narrow: on a 320dp screen a tab has about 54dp for its
// word, and "Transactions" at 11px needs about 61. The library's label can only
// cut that off ("Transacti…"); this one shrinks a little first, so the word is
// always whole. At 360dp and wider it draws at full size, exactly as before.

import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { THEME } from '../utils/theme';

const TabLabel: React.FC<{ color: string; children: string }> = ({ color, children }) => (
  <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
    {children}
  </Text>
);

/**
 * The label options for one tab. A label drawn by a function gets no spoken
 * name from the library, so it is given here — on iOS in the library's own
 * form, "Transactions, tab, 2 of 5".
 */
export const tabLabel = (
  text: string,
  position: number,
  count: number,
): Pick<BottomTabNavigationOptions, 'tabBarLabel' | 'tabBarAccessibilityLabel'> => ({
  tabBarLabel: ({ color }) => <TabLabel color={color}>{text}</TabLabel>,
  tabBarAccessibilityLabel: Platform.OS === 'ios' ? `${text}, tab, ${position} of ${count}` : text,
});

const styles = StyleSheet.create({
  label: {
    ...THEME.typography.labelSm,
    fontSize: THEME.typography.overline.fontSize,
    letterSpacing: -0.1,
    marginTop: 2,
    textAlign: 'center',
  },
});
