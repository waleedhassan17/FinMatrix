// ═══════════════════════════════════════════════════════
// FinMatrix — Monthly bar series
// ═══════════════════════════════════════════════════════
// A fixed-width month window with one bar per month, drawn from plain views for
// the same reason RevenueTrendCard is: the bars sit on exactly the card
// surface, radius and ink scale as everything around them, and a `null` month
// has to be drawn as a GAP rather than as a zero — which no chart library will
// do without being argued with.
//
// The distinction matters. On an item's stock history, null means "this item
// did not exist yet" and 0 means "it existed and was out of stock". A chart
// that cannot tell them apart invents a stockout.
//
// One series per chart, deliberately. Quantity and value do not share a scale,
// so overlaying them would be a dual-axis chart — two y-scales on one frame,
// where the crossing point is an artefact of the scales rather than anything in
// the data. They are drawn as two charts instead.

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

const BAR_AREA = 96;
const MIN_BAR = 3;
const COL_WIDTH = 52;

export interface MonthlyPoint {
  /** Stable key; the label repeats across years. */
  period: string;
  label: string;
  /** null draws a gap, not a zero. */
  value: number | null;
}

interface Props {
  points: MonthlyPoint[];
  /** Formats the readout and the accessibility label. */
  format: (value: number) => string;
  /** Short form for the figure above each bar. */
  compact: (value: number) => string;
  /** Series colour — one hue; this is a single series. */
  color?: string;
  /** Shown when every point is null or zero. */
  emptyLabel?: string;
  /** Title for the readout line when nothing is selected. */
  caption: string;
}

const MonthlyBars: React.FC<Props> = ({
  points,
  format,
  compact,
  color = colors.primary,
  emptyLabel = 'Nothing recorded in this period.',
  caption,
}) => {
  const [picked, setPicked] = useState<number | null>(null);

  const known = points.filter(p => p.value !== null) as { value: number }[];
  const max = known.length ? Math.max(...known.map(p => p.value), 0) : 0;

  if (known.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  const latest = [...points].reverse().find(p => p.value !== null);
  const selected = picked !== null && points[picked]?.value !== null ? picked : null;

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutLabel}>
          {selected === null ? caption : points[selected].label}
        </Text>
        <Text style={styles.readoutValue}>
          {selected === null
            ? format(latest?.value ?? 0)
            : format(points[selected].value as number)}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.plot}
      >
        {points.map((p, i) => {
          const on = selected === i;
          const missing = p.value === null;
          // A known zero still keeps a stub so the month reads as present; a
          // null draws the track and no bar at all.
          const height = missing
            ? 0
            : max > 0
              ? Math.max(MIN_BAR, Math.round(((p.value as number) / max) * BAR_AREA))
              : MIN_BAR;
          return (
            <TouchableOpacity
              key={p.period}
              style={styles.col}
              activeOpacity={missing ? 1 : 0.75}
              disabled={missing}
              onPress={() => setPicked(on ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: missing }}
              accessibilityLabel={
                missing
                  ? `${p.label}: not known`
                  : `${p.label}: ${format(p.value as number)}`
              }
            >
              <Text style={styles.value} numberOfLines={1}>
                {missing || p.value === 0 ? '' : compact(p.value as number)}
              </Text>
              <View style={styles.barTrack}>
                {missing ? (
                  <View style={styles.gap} />
                ) : (
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: color },
                      on && styles.barOn,
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                {p.label}
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
  readoutLabel: { ...typography.labelSm, color: colors.textTertiary, flex: 1 },
  readoutValue: { ...typography.h4, color: colors.textPrimary },
  plot: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: spacing.xxs },
  col: { width: COL_WIDTH, alignItems: 'center' },
  barTrack: { height: BAR_AREA, justifyContent: 'flex-end' },
  bar: { width: 22, borderTopLeftRadius: radius.xs, borderTopRightRadius: radius.xs },
  barOn: { borderWidth: 2, borderColor: colors.textPrimary },
  // A dotted stub reads as "no reading", where a short solid bar would read as
  // a small one.
  gap: {
    width: 22,
    height: MIN_BAR,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  value: { ...typography.overline, color: colors.textTertiary, marginBottom: spacing.xxs },
  label: {
    ...typography.overline,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelOn: { color: colors.textPrimary },
  empty: { ...typography.caption, color: colors.textTertiary },
});

export default MonthlyBars;
