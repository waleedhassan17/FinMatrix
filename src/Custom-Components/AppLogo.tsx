import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../utils/theme';
import BrandMark from './BrandMark';

type LogoSize = 'sm' | 'md' | 'lg';

interface AppLogoProps {
  size?: LogoSize;
}

// The mark is sized against the wordmark's cap height, so the lockup keeps its
// proportions at every size.
const sizeMap = {
  sm: { mark: 26, title: 16, gap: 8 },
  md: { mark: 38, title: 24, gap: 10 },
  lg: { mark: 52, title: 32, gap: 14 },
};

/** The brand lockup: the mark, then the name, in the logo's ink. */
const AppLogo: React.FC<AppLogoProps> = ({ size = 'md' }) => {
  const dims = sizeMap[size];

  return (
    <View
      style={[styles.container, { gap: dims.gap }]}
      accessible
      accessibilityLabel="FinMatrix"
    >
      <BrandMark size={dims.mark} />
      <Text style={[styles.title, { fontSize: dims.title }]}>FinMatrix</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: THEME.typography.labelMd.fontWeight,
    fontFamily: THEME.typography.fontFamily,
    color: THEME.colors.brandInk,
  },
});

export default AppLogo;
