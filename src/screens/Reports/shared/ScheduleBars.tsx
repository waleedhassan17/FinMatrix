// ═══════════════════════════════════════════════════════
// FinMatrix — What falls due when
// ═══════════════════════════════════════════════════════
// The aging report looks backwards (how late); this looks forwards: by due
// date from today, how much should come in (receivables) or must go out
// (payables) — overdue, this week, the next week, and on. Overdue is the bar
// that matters, so it alone takes the warning colour; the rest are one hue.
// Columns, each labelled with its amount, so the eye reads the size and the
// figure together. The amounts are the server's slots, which foot to the
// report's total.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { compactMoney } from '../../../models/itemExplorerModel';
import { parenNegative } from '../../../components/reports/reportFormat';
import type { AgingScheduleSlot } from '../../../models/arAgingModel';

const { colors, radius, spacing, typography } = THEME;

const BAR_H = 96;

/** "Due in 0–7 days" → "0–7 days": the column is narrow, the heading says "due". */
const shortLabel = (s: AgingScheduleSlot) =>
  s.key === 'overdue' ? 'Overdue' : s.label.replace(/^Due in /i, '').replace('more than ', '>');

const ScheduleBars: React.FC<{ slots: AgingScheduleSlot[]; noun: string }> = ({ slots, noun }) => {
  const max = Math.max(0, ...slots.map(s => Math.abs(s.amount)));
  if (slots.length === 0 || max === 0) {
    return <Text style={styles.empty}>Nothing open to schedule.</Text>;
  }
  return (
    <View style={styles.row}>
      {slots.map(s => {
        const overdue = s.key === 'overdue';
        const h = Math.max(s.amount === 0 ? 0 : 3, (Math.abs(s.amount) / max) * BAR_H);
        return (
          <View
            key={s.key}
            style={styles.col}
            accessible
            accessibilityLabel={`${s.label}: ${parenNegative(s.amount, 'Rs ')}, ${s.count} ${noun}${s.count === 1 ? '' : 's'}`}
          >
            <Text style={[styles.value, overdue && s.amount > 0 && styles.valueOverdue]} numberOfLines={1}>
              {s.amount === 0 ? '—' : compactMoney(s.amount)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.bar, { height: h }, overdue ? styles.barOverdue : null]} />
            </View>
            <Text style={[styles.label, overdue && styles.labelOverdue]} numberOfLines={2}>
              {shortLabel(s)}
            </Text>
            <Text style={styles.count}>{s.count}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xxs, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center' },
  value: { ...typography.overline, color: colors.textSecondary, textTransform: 'none', fontVariant: ['tabular-nums'] },
  valueOverdue: { color: colors.danger },
  track: { height: BAR_H, width: '100%', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 },
  bar: { width: '70%', backgroundColor: colors.navy400, borderTopLeftRadius: radius.xs, borderTopRightRadius: radius.xs },
  barOverdue: { backgroundColor: colors.danger },
  label: { ...typography.overline, color: colors.textTertiary, textTransform: 'none', textAlign: 'center', marginTop: 4 },
  labelOverdue: { color: colors.danger },
  count: { ...typography.caption, color: colors.textTertiary },
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.sm },
});

export default ScheduleBars;
