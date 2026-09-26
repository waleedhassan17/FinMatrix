// ═══════════════════════════════════════════════════════
// FinMatrix — Ranked horizontal bars
// ═══════════════════════════════════════════════════════
// "Which items earn the most" is a RANKED COMPARISON, not a time series, so it
// gets horizontal bars sorted by size rather than a line over months. The label
// sits beside the bar and reads left to right, which is why the bars are
// horizontal: a hundred item names will not fit under vertical columns.
//
// One hue, not one per item. Bar LENGTH carries the comparison; colour would be
// carrying nothing, and a palette long enough for every item does not exist.
// The exception is a negative value, which takes the danger token — that is a
// status, and an item selling below cost is the single most important thing
// this chart can surface.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

export interface RankedPoint {
  key: string;
  label: string;
  value: number;
  /** Shown under the label — units sold, margin, whatever qualifies the bar. */
  hint?: string;
}

interface Props {
  points: RankedPoint[];
  /** How many bars before the tail is folded into one "Other". */
  limit?: number;
  format: (value: number) => string;
  emptyLabel?: string;
  /**
   * Tapping a bar — opening the item, filtering by the category. The folded
   * "Other" row never responds: it is not one thing to open.
   */
  onSelect?: (key: string) => void;
  /** A bar to mark as chosen (a filter it applies, say). */
  activeKey?: string | null;
  /** Whether a tap goes somewhere (a chevron) or toggles in place (none). */
  navigates?: boolean;
}

const RankedBars: React.FC<Props> = ({
  points,
  limit = 10,
  format,
  emptyLabel = 'Nothing to rank yet.',
  onSelect,
  activeKey = null,
  navigates = false,
}) => {
  if (points.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  const head = points.slice(0, limit);
  const tail = points.slice(limit);
  // The tail is folded rather than dropped, so the bars still add up to the
  // total shown above them. Dropping it would make the chart disagree with the
  // table for no visible reason.
  const rows: RankedPoint[] = tail.length
    ? [
        ...head,
        {
          key: '__other__',
          label: `Other (${tail.length})`,
          value: tail.reduce((t, p) => t + p.value, 0),
        },
      ]
    : head;

  // Scaled on magnitude so a loss-making bar is as long as an equal profit,
  // drawn in danger ink. Scaling on the signed value would give it a negative
  // width and it would vanish — exactly the row worth seeing.
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 0);

  return (
    <View style={styles.wrap}>
      {rows.map(r => {
        const negative = r.value < 0;
        const pct = max > 0 ? Math.max(2, (Math.abs(r.value) / max) * 100) : 2;
        const tappable = !!onSelect && r.key !== '__other__';
        const active = activeKey !== null && r.key === activeKey;
        const body = (
          <>
            <View style={styles.head}>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={[styles.value, negative && styles.valueNegative]}>
                {format(r.value)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { width: `${pct}%` },
                  negative && styles.barNegative,
                ]}
              />
            </View>
            {r.hint ? (
              <Text style={styles.hint} numberOfLines={1}>
                {r.hint}
              </Text>
            ) : null}
          </>
        );
        return tappable ? (
          <TouchableOpacity
            key={r.key}
            style={[styles.row, styles.tapRow, active && styles.rowActive]}
            activeOpacity={0.6}
            onPress={() => onSelect!(r.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${r.label}, ${format(r.value)}`}
          >
            <View style={styles.tapBody}>{body}</View>
            {navigates ? <Feather name="chevron-right" size={16} color={colors.textTertiary} /> : null}
          </TouchableOpacity>
        ) : (
          <View key={r.key} style={[styles.row, onSelect && styles.staticRow, navigates && styles.staticNav]}>
            {navigates ? (
              <>
                <View style={styles.tapBody}>{body}</View>
                {/* Room for the chevron the tappable rows carry, so every
                    bar in the list ends at the same edge. */}
                <View style={styles.chevronSpace} />
              </>
            ) : (
              body
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.xxs },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  label: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  labelActive: { color: colors.primary },
  tapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderRadius: radius.md,
  },
  tapBody: { flex: 1, gap: spacing.xxs },
  rowActive: { backgroundColor: colors.primaryLight },
  staticRow: { paddingVertical: spacing.xxs },
  staticNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chevronSpace: { width: 16 },
  value: { ...typography.labelSm, color: colors.textPrimary },
  valueNegative: { color: colors.danger },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.neutral100,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.full, backgroundColor: colors.navy500 },
  barNegative: { backgroundColor: colors.danger },
  hint: { ...typography.overline, color: colors.textTertiary },
  empty: { ...typography.caption, color: colors.textTertiary },
});

export default RankedBars;
