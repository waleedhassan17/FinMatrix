// ═══════════════════════════════════════════════════════
// FinMatrix — A line on an invoice, bill or purchase order
// ═══════════════════════════════════════════════════════
// Five columns do not fit a phone: "Rs 41,372.40" broke onto two lines, "Qty"
// ran into "Recvd", and a tax rate sat flush against the figure beside it. So
// the line reads as a sentence instead — what it is on the left, the amount on
// the right, on one line and in full, and quantity × rate underneath.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../theme';

const { colors, spacing, typography } = THEME;

/** The ruled heading over the lines: what they are, and what they come to. */
export const DocLinesHeader: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.header}>
    <Text style={styles.headerText}>{label}</Text>
    <Text style={styles.headerText}>Amount</Text>
  </View>
);

export const DocLineRow: React.FC<{
  title: string;
  amount: string;
  /** Lines under the title: "40 × Rs 1,034.31 · 17% tax", a description. */
  details?: (string | null | undefined | false)[];
  /** Under the details, for a line that also carries a state. */
  footer?: React.ReactNode;
}> = ({ title, amount, details, footer }) => (
  <View style={styles.row} accessible accessibilityLabel={[title, ...(details ?? []).filter(Boolean), amount].join(', ')}>
    <View style={styles.top}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.amount} numberOfLines={1}>
        {amount}
      </Text>
    </View>
    {(details ?? []).filter(Boolean).map((d, i) => (
      <Text key={i} style={styles.detail} numberOfLines={2}>
        {d}
      </Text>
    ))}
    {footer}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { ...typography.labelSm, color: colors.textSecondary },
  row: {
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // The title gives way; the figure never wraps or clips.
  title: { ...typography.labelMd, color: colors.textPrimary, flex: 1, minWidth: 0 },
  amount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 0 },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
