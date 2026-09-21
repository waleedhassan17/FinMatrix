// ═══════════════════════════════════════════════════════
// FinMatrix — Aging bucket chart
// ═══════════════════════════════════════════════════════
// How much is owed, by how late it is. One bar per bucket, ABSOLUTE amounts.
//
// Two deliberate choices:
//
// • Hand-drawn views rather than react-native-chart-kit, the same reasoning as
//   RevenueTrendCard: the bars sit on exactly the card surface, radius and ink
//   scale as everything around them, and — the deciding factor here — every bar
//   needs its own colour from the ramp, which chart-kit's BarChart will not do.
//
// • A sequential ramp, not CHART_SERIES. Aging buckets are ORDINAL: reordering
//   "1–30" and "61–90" would change the meaning, so age reads as lightness and
//   the chart stays legible whether the company runs five buckets or fourteen.
//   CHART_SERIES holds five hues picked to be told apart, which would both run
//   out and imply differences between buckets that do not exist.

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { THEME, AGING_RAMP, rampSteps } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import type { AgingBucketDef } from '../../../models/arAgingModel';

const { colors, radius, spacing, typography } = THEME;

/** Tall enough to read a ratio, short enough to leave the table above the fold. */
const BAR_AREA = 104;
/** Every bucket keeps a visible stub, so an empty column is not a missing one. */
const MIN_BAR = 3;
const COL_WIDTH = 64;

const compact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

interface Props {
  buckets: AgingBucketDef[];
  amounts: Record<string, number>;
  /** 'Rs ' — passed through rather than assumed, as the tables do. */
  currency?: string;
}

const AgingBucketChart: React.FC<Props> = ({ buckets, amounts, currency = 'Rs ' }) => {
  const [picked, setPicked] = useState<number | null>(null);

  const values = buckets.map(b => {
    const v = amounts[b.key];
    return Number.isFinite(v) ? v : 0;
  });
  const max = Math.max(...values, 0);

  // Nothing outstanding is not a chart. The caller still renders the table, so
  // this returning null loses no information.
  if (max <= 0) return null;

  const ramp = rampSteps(buckets.length, AGING_RAMP);
  const selected = picked !== null ? picked : null;

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutLabel}>
          {selected === null ? 'Outstanding by age' : buckets[selected].label}
        </Text>
        <Text style={styles.readoutValue}>
          {selected === null
            ? formatCurrency(values.reduce((t, v) => t + v, 0), currency)
            : formatCurrency(values[selected], currency)}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // A 3-day preset produces six columns and a custom one up to fourteen,
        // which cannot share a phone width. The table beside it already pans.
        contentContainerStyle={styles.plot}
      >
        {buckets.map((bucket, i) => {
          const on = selected === i;
          const height = Math.max(MIN_BAR, Math.round((values[i] / max) * BAR_AREA));
          return (
            <TouchableOpacity
              key={bucket.key}
              style={styles.col}
              activeOpacity={0.75}
              onPress={() => setPicked(on ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${bucket.label}: ${formatCurrency(values[i], currency)}`}
            >
              <Text style={styles.value} numberOfLines={1}>
                {values[i] > 0 ? compact(values[i]) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: ramp[i] },
                    on && styles.barOn,
                  ]}
                />
              </View>
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                {bucket.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  readoutLabel: { ...typography.labelSm, color: colors.textTertiary },
  readoutValue: { ...typography.h4, color: colors.textPrimary },
  plot: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: spacing.xxs },
  col: { width: COL_WIDTH, alignItems: 'center' },
  barTrack: { height: BAR_AREA, justifyContent: 'flex-end' },
  bar: { width: 26, borderTopLeftRadius: radius.xs, borderTopRightRadius: radius.xs },
  // Selection is a ring rather than a colour change: the bar's colour is its
  // position in the ramp and must not move when it is tapped.
  barOn: { borderWidth: 2, borderColor: colors.textPrimary },
  value: { ...typography.overline, color: colors.textTertiary, marginBottom: spacing.xxs },
  label: {
    ...typography.overline,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelOn: { color: colors.textPrimary },
});

export default AgingBucketChart;
