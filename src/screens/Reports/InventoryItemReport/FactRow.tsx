// ═══════════════════════════════════════════════════════
// FinMatrix — One fact in an item card
// ═══════════════════════════════════════════════════════
// A label on the left, its value on the right, and an optional quieter line
// under the value ("96 days ago", "23.4% of the price") — the rail rows of
// the web's item explorer. SummaryLine takes a single string, so it cannot
// carry the second line.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';

const { colors, spacing, typography } = THEME;

interface Props {
  label: string;
  value: string;
  detail?: string;
  /** Something beside the label — an ⓘ. */
  labelAccessory?: React.ReactNode;
  strong?: boolean;
  /** A value that is the absence of one: "No recent sales". */
  muted?: boolean;
  /** A value that is bad news: a price below cost. */
  danger?: boolean;
}

export const FactRow: React.FC<Props> = ({ label, value, detail, labelAccessory, strong, muted, danger }) => (
  <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}>
    <View style={styles.labelBox}>
      <Text style={styles.label}>{label}</Text>
      {labelAccessory}
    </View>
    <View style={styles.valueBox}>
      <Text style={[styles.value, strong && styles.strong, muted && styles.muted, danger && styles.danger]}>{value}</Text>
      {detail ? <Text style={[styles.detail, danger && styles.danger]}>{detail}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  labelBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { ...typography.bodySm, color: colors.textSecondary },
  valueBox: { alignItems: 'flex-end', flexShrink: 1 },
  value: { ...typography.bodySm, color: colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  strong: { ...typography.labelLg },
  muted: { color: colors.textTertiary },
  danger: { color: colors.danger },
  detail: { ...typography.caption, color: colors.textTertiary, textAlign: 'right' },
});

export default FactRow;
