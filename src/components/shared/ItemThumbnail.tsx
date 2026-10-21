// ═══════════════════════════════════════════════════════
// FinMatrix — Item thumbnail
// ═══════════════════════════════════════════════════════
// An inventory item's photo, or a package icon on the brand tint when it has
// none — or when the photo fails to load (an expired link, no signal). The
// URL is a signed link from the API, so it loads with no token; React Native's
// image cache keys on it, and the server keeps it identical all day.

import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../utils/theme';

const { colors } = THEME;

interface Props {
  uri?: string | null;
  /** The tile's box: width/height (or flex), and its corner radius. */
  style: StyleProp<ImageStyle>;
  iconSize?: number;
  /** `cover` fills a grid tile; `contain` shows the whole photo. */
  resizeMode?: 'cover' | 'contain';
}

const ItemThumbnail: React.FC<Props> = ({ uri, style, iconSize = 18, resizeMode = 'cover' }) => {
  // Remembers WHICH link failed, so a new photo (or a refreshed link) gets a
  // fresh attempt without an effect to reset anything.
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <View style={[styles.placeholder, style as any]} accessibilityLabel="No photo">
        <Feather name="package" size={iconSize} color={colors.primary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      onError={() => setFailedUri(uri)}
      accessibilityIgnoresInvertColors
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { backgroundColor: colors.neutral100 },
});

export default ItemThumbnail;
