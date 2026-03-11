import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

type LogoSize = 'sm' | 'md' | 'lg';

interface AppLogoProps {
  size?: LogoSize;
}

const sizeMap = {
  sm: { circle: 48, initials: 18, title: 16 },
  md: { circle: 80, initials: 30, title: 24 },
  lg: { circle: 120, initials: 44, title: 32 },
};

const AppLogo: React.FC<AppLogoProps> = ({ size = 'md' }) => {
  const dims = sizeMap[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: dims.circle,
            height: dims.circle,
            borderRadius: dims.circle / 2,
          },
        ]}>
        <Text style={[styles.initials, { fontSize: dims.initials }]}>FM</Text>
      </View>
      <Text style={[styles.title, { fontSize: dims.title }]}>FinMatrix</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  initials: {
    fontWeight: '800',
    color: colors.white,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
});

export default AppLogo;
