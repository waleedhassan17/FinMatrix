import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../utils/theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors } = THEME;

interface NotificationBadgeProps {
  count: number;
  /**
   * The ring that separates the badge from what it sits on. It should be the
   * colour BEHIND the icon: white on the tab bar (the default), the header
   * navy on the dashboard bell, where a white ring would read as a halo.
   */
  ringColor?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, ringColor }) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View
      style={[styles.badge, displayCount.length > 2 && styles.badgeWide, ringColor ? { borderColor: ringColor } : null]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.neutral0,
    zIndex: 10,
  },
  badgeWide: {
    minWidth: 26,
    paddingHorizontal: 5,
  },
  text: {
    ...THEME.typography.overline,
    color: colors.neutral0,
  },
});

export default NotificationBadge;
