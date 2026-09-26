// ═══════════════════════════════════════════════════════
// FinMatrix — Report bottom sheet
// ═══════════════════════════════════════════════════════
// The phone's side panel: something to look into without leaving the screen
// it came from — a month's documents, a period to choose. It slides up over a
// scrim; tapping the scrim, the ✕ or the back button closes it, and the screen
// underneath has not moved. Same shape as ApplyAdvanceModal's sheet.

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Pinned under the scrolling body — a total. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const BottomSheet: React.FC<Props> = ({ visible, onClose, title, subtitle, footer, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.grip} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  grip: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerText: { flex: 1 },
  title: { ...typography.h5, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface2,
  },
});

export default BottomSheet;
