// ═══════════════════════════════════════════════════════
// FinMatrix — Hub list
// ═══════════════════════════════════════════════════════
// The one list the three tab hubs (Transactions, Reports, More) are drawn
// from: a section label above a card, and rows inside it that all have the
// same anatomy — a navy icon tile, a title, one line saying what is behind it,
// an optional count and a chevron.
//
// Each hub used to draw its own: three title sizes (14, 15, 16), two icon
// tiles (42 and 44) or none, subtitles that wrapped to a second line, section
// headers inside the card on two screens and above it on the third, and a
// different pastel colour on every icon. Side by side they read as three
// products. One component makes them one.

import React from 'react';
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../theme';

const { colors, radius, shadows, spacing, typography } = THEME;

/**
 * The longest subtitle that stays on one line on a 360dp phone at the
 * default font size: the row leaves the subtitle ~220dp beside the icon,
 * count and chevron. Copy longer than this is cut with an ellipsis, so the
 * hubs keep their copy inside it (see the copy guard in HubList.test.tsx).
 */
export const HUB_SUBTITLE_MAX = 34;

/** Uppercase label that names a group of rows (or any block on a hub). */
export const HubSectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.label} accessibilityRole="header">
    {title}
  </Text>
);

/** A labelled card holding a group of `HubRow`s. */
export const HubSection: React.FC<{
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, children, style }) => (
  <View style={style}>
    <HubSectionLabel title={title} />
    <View style={styles.card}>{children}</View>
  </View>
);

export type HubCountTone = 'neutral' | 'alert';

export interface HubRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  /**
   * A number shown before the chevron; hidden at 0. `neutral` for a plain
   * total (how many customers there are), `alert` for work waiting on the
   * person looking (approvals to decide, deliveries to assign). A red dot on
   * a total said "something is wrong" when nothing was.
   */
  count?: number;
  countTone?: HubCountTone;
  /** The last row of its card draws no divider under it. */
  last?: boolean;
}

export const HubRow: React.FC<HubRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  count = 0,
  countTone = 'neutral',
  last = false,
}) => {
  const showCount = count > 0;
  const countText = count > 99 ? '99+' : String(count);
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.neutral100 }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}${showCount ? `, ${countText}` : ''}`}
    >
      <View style={styles.iconTile}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      {/* The divider starts at the text, not the card edge. */}
      <View style={[styles.body, !last && styles.bodyBordered]}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {showCount ? (
          <View
            testID="hub-row-count"
            style={[styles.count, countTone === 'alert' ? styles.countAlert : styles.countNeutral]}
          >
            <Text style={[styles.countText, countTone === 'alert' && styles.countTextAlert]}>{countText}</Text>
          </View>
        ) : null}
        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
};

/** Scroll content for a hub: the gutter and the space between its sections. */
export const hubContentStyle: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.xxl,
  gap: spacing.xl,
};

const ICON_TILE = 36;

const styles = StyleSheet.create({
  label: {
    ...typography.overline,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
    marginBottom: spacing.xs,
  },
  // Same surface as the reports kit's Card, so a hub card and a report card
  // are the same object.
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.neutral50 },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  bodyBordered: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  text: { flex: 1 },
  title: { ...typography.labelLg, color: colors.textPrimary },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  count: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNeutral: { backgroundColor: colors.neutral100 },
  countAlert: { backgroundColor: colors.danger },
  countText: { ...typography.labelSm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  countTextAlert: { color: colors.neutral0 },
});
