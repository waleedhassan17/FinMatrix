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

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { THEME, AGING_RAMP, rampSteps } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import {
  bucketTopParties,
  formatShare,
  type AgingBucketDef,
  type ARAgingRow,
} from '../../../models/arAgingModel';

const { colors, radius, spacing, typography } = THEME;

/** Tall enough to read a ratio, short enough to leave the table above the fold. */
const BAR_AREA = 104;
/** Every bucket keeps a visible stub, so an empty column is not a missing one. */
const MIN_BAR = 3;
const COL_WIDTH = 64;
/** How many parties the readout names before folding the rest away. */
const READOUT_PARTY_LIMIT = 2;
/** Unselected bars keep their ramp step and lose contrast. */
const DIMMED = 0.35;

const compact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

interface Props {
  buckets: AgingBucketDef[];
  amounts: Record<string, number>;
  /**
   * The report total, from the server. Each bar's share is printed under its
   * label against it — the same figure the web prints — and the readout
   * shows it rather than adding the columns up on the phone.
   */
  total?: number;
  /**
   * The per-party rows behind those totals. Given them, the readout names who
   * is in the tapped bucket — the phone's answer to a hover tooltip, and a
   * better one, because it stays on screen instead of vanishing with the finger.
   */
  rows?: ARAgingRow[];
  /** Controlled: the screen owns the selection, because the list below filters on it. */
  selectedBucketKey?: string | null;
  onSelectBucket?: (key: string | null) => void;
  /** 'Rs ' — passed through rather than assumed, as the tables do. */
  currency?: string;
}

const AgingBucketChart: React.FC<Props> = ({
  buckets,
  amounts,
  total,
  rows,
  selectedBucketKey = null,
  onSelectBucket,
  currency = 'Rs ',
}) => {
  // Ranked once per payload, not per tap.
  const rankings = useMemo(() => {
    if (!rows?.length) return null;
    return new Map(
      buckets.map(b => [
        b.key,
        bucketTopParties({ rows, bucketKey: b.key, limit: READOUT_PARTY_LIMIT }),
      ]),
    );
  }, [rows, buckets]);

  const values = buckets.map(b => {
    const v = amounts[b.key];
    return Number.isFinite(v) ? v : 0;
  });
  const max = Math.max(...values, 0);
  const grand = total ?? values.reduce((t, v) => t + v, 0);

  // Nothing outstanding is not a chart. The caller still renders the table, so
  // this returning null loses no information.
  if (max <= 0) return null;

  const ramp = rampSteps(buckets.length, AGING_RAMP);
  const selectedIndex = buckets.findIndex(b => b.key === selectedBucketKey);
  const selected = selectedIndex >= 0 ? selectedIndex : null;
  const ranked = selected === null ? null : rankings?.get(buckets[selected].key);

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutLabel}>
          {selected === null ? 'Outstanding by age' : buckets[selected].label}
        </Text>
        <Text style={styles.readoutValue}>
          {selected === null
            ? formatCurrency(grand, currency)
            : formatCurrency(values[selected], currency)}
        </Text>
      </View>

      {/* Who is in the tapped bucket. The whole point of the tap: a column
          total says how bad, a name says who to call. */}
      {ranked && ranked.parties.length > 0 && (
        <View style={styles.who}>
          {ranked.parties.map(p => (
            <View key={p.id || p.name} style={styles.whoRow}>
              <Text style={styles.whoName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.whoAmount}>{formatCurrency(p.amount, currency)}</Text>
            </View>
          ))}
          {ranked.moreCount > 0 && (
            <Text style={styles.whoMore}>
              +{ranked.moreCount} more · {formatCurrency(ranked.moreAmount, currency)}
            </Text>
          )}
        </View>
      )}

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
              onPress={() => onSelectBucket?.(on ? null : bucket.key)}
              disabled={!onSelectBucket}
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
                    // Opacity, never a different colour: the bar's hue is its
                    // position in the ramp and must not move when something
                    // else is selected.
                    {
                      height,
                      backgroundColor: ramp[i],
                      opacity: selected !== null && !on ? DIMMED : 1,
                    },
                    on && styles.barOn,
                  ]}
                />
              </View>
              {/* Two lines, so "91 and over" is never cut to "91 AND …"; the
                  fixed height keeps every share below on one baseline. */}
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={2}>
                {bucket.label}
              </Text>
              <Text style={styles.share} numberOfLines={1}>
                {formatShare(grand > 0 ? values[i] / grand : 0)}
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
  who: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xxs,
  },
  whoRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  whoName: { ...typography.caption, color: colors.textSecondary, flex: 1, marginRight: spacing.sm },
  whoAmount: { ...typography.caption, color: colors.textPrimary },
  whoMore: { ...typography.overline, color: colors.textTertiary },
  plot: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: spacing.xxs },
  col: { width: COL_WIDTH, alignItems: 'center' },
  barTrack: { height: BAR_AREA, justifyContent: 'flex-end' },
  bar: { width: 26, borderTopLeftRadius: radius.xs, borderTopRightRadius: radius.xs },
  // Selection is a ring rather than a colour change: the bar's colour is its
  // position in the ramp and must not move when it is tapped.
  barOn: { borderWidth: 2, borderColor: colors.textPrimary },
  // The amount above each bar is read, not glanced at — primary ink, as on the web.
  value: { ...typography.overline, color: colors.textPrimary, marginBottom: spacing.xxs },
  label: {
    ...typography.overline,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    height: typography.overline.lineHeight * 2,
  },
  labelOn: { color: colors.textPrimary },
  share: { ...typography.overline, color: colors.textTertiary, opacity: 0.8, marginTop: 1 },
});

export default AgingBucketChart;
