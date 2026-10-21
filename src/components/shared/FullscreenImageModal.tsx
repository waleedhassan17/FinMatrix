// ═══════════════════════════════════════════════════════
// FinMatrix — Full-screen image viewer
// ═══════════════════════════════════════════════════════
// A photo on a dark backdrop, whole (contain), with a close button below the
// status bar. A Modal rather than a route, so record screens shared across
// tabs can open it without navigating (see crossTabNavigation.test.ts).

import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../utils/theme';

const { colors, spacing, radius } = THEME;

interface Props {
  /** The image to show; null/'' hides the viewer. */
  uri: string | null;
  onClose: () => void;
  accessibilityLabel?: string;
}

const FullscreenImageModal: React.FC<Props> = ({ uri, onClose, accessibilityLabel = 'Photo' }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={[styles.close, { top: insets.top + spacing.xs }]}
          onPress={onClose}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <Feather name="x" size={22} color={colors.neutral0} />
        </TouchableOpacity>
        {!!uri && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={accessibilityLabel}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.neutral900, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.neutral800,
    borderWidth: 1,
    borderColor: colors.neutral700,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
});

export default FullscreenImageModal;
