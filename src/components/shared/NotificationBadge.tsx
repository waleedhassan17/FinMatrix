import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { THEME } from '../../utils/theme';

interface NotificationBadgeProps {
  count: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={[styles.badge, displayCount.length > 2 && styles.badgeWide]}>
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
    backgroundColor: '#DE350B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
    zIndex: 10,
  },
  badgeWide: {
    minWidth: 26,
    paddingHorizontal: 5,
  },
  text: {
    ...THEME.typography.overline,
    color: colors.white,
  },
});

export default NotificationBadge;
