// ═══════════════════════════════════════════════════════
// FinMatrix — THE button
// ═══════════════════════════════════════════════════════
// Every action button in the signed-in app is this component, directly or
// through the FormUI wrappers (PrimaryButton, SecondaryButton,
// DestructiveButton) and the ActionBar that lays them out.
//
//   primary      navy fill — the one next step. At most one per bar.
//   secondary    white, neutral border, navy label.
//   destructive  white, red border tint, red label — Void / Delete on a page.
//   danger       red fill — only the final "yes, do it" of a confirmation.
//   text         a navy label with no surface; inline links only, never in a bar.
//
// One action height: md, 48dp. sm (36dp) is for compact actions inside a card
// ("Create a bill", "Pay all in full"). There is no larger size: a 56dp button
// beside 48dp ones is the inconsistency this file exists to end.
//
// A label never wraps: one line, shrinking a little before it would. A
// two-line "Record Payment" grew the whole bar it sat in.

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { THEME } from '../utils/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  /**
   * Tighter side padding, for a button sharing a bar with others — the label
   * gets the width instead of the padding. ActionBar sets it.
   */
  compact?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const { colors } = THEME;

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  fullWidth = false,
  compact = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isDisabled = disabled || isLoading;
  const small = size === 'sm';

  const loaderColor =
    variant === 'primary' || variant === 'danger'
      ? colors.neutral0
      : variant === 'destructive'
        ? colors.danger
        : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        VARIANT[variant],
        small ? styles.size_sm : styles.size_md,
        compact && styles.compact,
        fullWidth ? styles.fullWidth : undefined,
        isDisabled ? styles.disabled : undefined,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={loaderColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={[styles.iconWrapper, compact && styles.iconWrapperCompact]}>{icon}</View> : null}
          <Text
            style={[styles.text, TEXT[variant], small || compact ? styles.textSize_sm : styles.textSize_md]}
            numberOfLines={1}
            adjustsFontSizeToFit
            // A bar's slots are narrow on a 320dp phone; let those labels give a
            // little more before they would cut off.
            minimumFontScale={compact ? 0.75 : 0.85}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    // Controls sit at 8; 12 is the card radius. A button as round as the card
    // it sits on reads as a pill rather than a control.
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Lets the label shrink inside a narrow bar slot instead of overflowing.
    maxWidth: '100%',
    flexShrink: 1,
  },
  iconWrapper: {
    marginRight: 8,
  },
  iconWrapperCompact: {
    marginRight: 6,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  size_sm: {
    paddingHorizontal: 14,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: 20,
    minHeight: 48,
  },
  // A bar's buttons share a phone's width: 10 a side and the 14px label is what
  // lets [share] [Remind] [Record Payment] fit a 320dp screen without shrinking.
  compact: {
    paddingHorizontal: 10,
  },

  text: {
    fontFamily: THEME.typography.fontFamily,
    fontWeight: THEME.typography.labelLg.fontWeight,
    flexShrink: 1,
  },
  textSize_sm: {
    fontSize: THEME.typography.h5.fontSize,
  },
  textSize_md: {
    fontSize: THEME.typography.labelLg.fontSize,
  },
});

const VARIANT = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  // A neutral outline, not a second accent. Two navy-bordered buttons side by
  // side compete for the same attention; the primary should be the only thing
  // on screen wearing the brand colour.
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Red says what the action does without shouting it: a filled red block
  // was the loudest thing on screens where deleting is the rarest choice.
  destructive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerLight,
  },
  text: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
});

const TEXT = StyleSheet.create({
  primary: { color: colors.neutral0 },
  secondary: { color: colors.primary },
  destructive: { color: colors.danger },
  text: { color: colors.primary },
  danger: { color: colors.neutral0 },
});

export default CustomButton;
