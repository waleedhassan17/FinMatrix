// ═══════════════════════════════════════════════════════
// FinMatrix — A part-to-whole ring, with its table
// ═══════════════════════════════════════════════════════
// At most six slices plus a grey Other, the whole in the centre, and under it
// a row for every slice — its value, its share and what it counts — which is
// also how a screen reader uses the chart. Tapping a slice or its row chooses
// it (a filter on the view below); Other is not a choice. Where a row opens a
// record instead (a customer), only the row does, with a chevron. The
// website's DonutChart, drawn in react-native-svg.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';

import { THEME } from '../../../theme';
import { CATEGORY_OTHER } from '../../../theme/theme';
import { formatSliceShare, OTHER_KEY, sliceShare, type SlicePoint } from '../../../models/chartSlicesModel';
import { compactMoney } from '../../../models/itemExplorerModel';
import { parenNegative } from '../../../components/reports/reportFormat';

const { colors, radius, spacing, typography } = THEME;

const SIZE = 180;
const MID = SIZE / 2;
// The ring stops short of its box so the slice in focus can stand proud of it
// — it grows to the edge — and still read when its colour is the palest.
const OUTER = MID * 0.95;
const INNER = MID * 0.64;
// The centre's text block: the hole is 64% of the ring, and a block 48% wide
// keeps even a two-line name clear of it.
const CENTER_WIDTH = Math.round(SIZE * 0.48);

const point = (r: number, a: number) => [MID + r * Math.cos(a), MID + r * Math.sin(a)];

/** One ring segment from angle a0 to a1 (radians, clockwise from 12 o'clock). */
const arc = (a0: number, a1: number, outer = OUTER): string => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = point(outer, a0);
  const [x1, y1] = point(outer, a1);
  const [x2, y2] = point(INNER, a1);
  const [x3, y3] = point(INNER, a0);
  return `M${x0},${y0} A${outer},${outer} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${INNER},${INNER} 0 ${large} 0 ${x3},${y3} Z`;
};

/** Each drawn slice's start and end angle, clockwise from 12 o'clock. */
const ringSegments = (drawn: SlicePoint[]) => {
  const total = drawn.reduce((t, s) => t + s.value, 0);
  let angle = -Math.PI / 2;
  return drawn.map(slice => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const seg = { slice, a0: angle, a1: angle + sweep };
    angle += sweep;
    return seg;
  });
};

interface Props {
  /** What the chart shows: "Stock value by category". */
  title: string;
  /** Already folded to at most six plus Other, largest first (or in age order). */
  slices: SlicePoint[];
  /** One colour per named slice, in order; Other is always grey. */
  palette: readonly string[];
  /** The whole, for the centre — the server's total when there is one. */
  total?: number;
  /** Under the centre figure: "Stock value". */
  centerLabel: string;
  /** The heading over the slice names: "Category". */
  labelHeader: string;
  /** The heading over the figures: "Revenue". */
  valueHeader?: string;
  format?: (v: number) => string;
  /** The centre figure, short: "Rs 82K". */
  formatCenter?: (v: number) => string;
  /** "12 items" — what a slice's count is of. */
  countLabel?: (count: number) => string;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** What choosing does, for a screen reader: "List the items in". */
  selectVerb?: string;
  /**
   * Opens the record behind a row — a customer. Only the rows open, each with
   * a chevron: a narrow slice is too easy to tap by mistake to leave the
   * screen on, so a slice only lights its row. `canOpen` says which rows lead
   * somewhere; Other never does.
   */
  onOpen?: (key: string) => void;
  canOpen?: (key: string) => boolean;
}

const DonutChart: React.FC<Props> = ({
  title,
  slices,
  palette,
  total,
  centerLabel,
  labelHeader,
  valueHeader = 'Value',
  format = (v: number) => parenNegative(v, 'Rs '),
  formatCenter = compactMoney,
  countLabel,
  selectedKey = null,
  onSelect,
  selectVerb = 'Show',
  onOpen,
  canOpen,
}) => {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const whole = total ?? slices.reduce((t, s) => t + s.value, 0);
  const drawn = slices.filter(s => s.value > 0);
  if (whole <= 0 || drawn.length === 0) {
    return <Text style={styles.empty}>Nothing to show for this view.</Text>;
  }

  let named = 0;
  const colorOf = new Map<string, string>();
  for (const s of slices) colorOf.set(s.key, s.key === OTHER_KEY ? CATEGORY_OTHER : palette[named++] ?? CATEGORY_OTHER);
  const focus = focusKey ?? selectedKey;
  const focused = focus ? slices.find(s => s.key === focus) : undefined;
  const choosable = (s: SlicePoint) => !!onSelect && s.key !== OTHER_KEY;
  const openable = (s: SlicePoint) => !!onOpen && s.key !== OTHER_KEY && (canOpen ? canOpen(s.key) : true);
  const segments = ringSegments(drawn);

  return (
    <View accessible={false}>
      <View style={styles.ringWrap} accessible accessibilityRole="image" accessibilityLabel={title}>
        <Svg width={SIZE} height={SIZE}>
          {segments.length === 1 ? (
            <Circle
              cx={MID}
              cy={MID}
              r={(OUTER + INNER) / 2}
              stroke={colorOf.get(segments[0].slice.key)}
              strokeWidth={OUTER - INNER}
              fill="none"
            />
          ) : (
            segments.map(({ slice, a0, a1 }) => (
              <Path
                key={slice.key}
                d={arc(a0, a1, focus === slice.key ? MID : OUTER)}
                fill={colorOf.get(slice.key)}
                opacity={focus && focus !== slice.key ? 0.3 : 1}
                stroke={colors.surface}
                strokeWidth={2}
                onPress={() => (choosable(slice) ? onSelect?.(slice.key) : setFocusKey(k => (k === slice.key ? null : slice.key)))}
              />
            ))
          )}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <View style={styles.centerBlock}>
            <Text style={styles.centerValue} numberOfLines={1}>
              {formatCenter(focused ? focused.value : whole)}
            </Text>
            <Text style={styles.centerLabel} numberOfLines={2}>
              {focused ? focused.label : centerLabel}
            </Text>
            {focused ? <Text style={styles.centerShare}>{formatSliceShare(sliceShare(focused, whole))}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.headRow}>
          <Text style={[styles.head, { flex: 1 }]}>{labelHeader}</Text>
          <Text style={styles.head}>{valueHeader}</Text>
          <Text style={[styles.head, styles.shareCol]}>Share</Text>
          {onOpen ? <View style={styles.chevronCol} /> : null}
        </View>
        {slices.map(s => {
          const selected = selectedKey === s.key;
          const share = formatSliceShare(sliceShare(s, whole));
          const row = (
            <>
              <View style={[styles.swatch, { backgroundColor: colorOf.get(s.key) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, focus && focus !== s.key && styles.dim]} numberOfLines={1}>
                  {s.label}
                </Text>
                {countLabel && s.count !== undefined ? <Text style={styles.count}>{countLabel(s.count)}</Text> : null}
              </View>
              <Text style={styles.value}>{format(s.value)}</Text>
              <Text style={[styles.share, styles.shareCol]}>{share}</Text>
              {onOpen ? (
                <View style={styles.chevronCol}>
                  {openable(s) ? <Feather name="chevron-right" size={14} color={colors.textTertiary} /> : null}
                </View>
              ) : null}
            </>
          );
          if (openable(s)) {
            return (
              <Pressable
                key={s.key}
                style={({ pressed }) => [styles.row, (pressed || focus === s.key) && styles.rowOn]}
                onPress={() => onOpen?.(s.key)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${s.label}: ${format(s.value)}, ${share}`}
              >
                {row}
              </Pressable>
            );
          }
          return choosable(s) ? (
            <Pressable
              key={s.key}
              style={[styles.row, (selected || focus === s.key) && styles.rowOn]}
              onPress={() => onSelect?.(s.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${selectVerb} ${s.label}: ${format(s.value)}, ${share}`}
            >
              {row}
            </Pressable>
          ) : (
            <View
              key={s.key}
              style={[styles.row, focus === s.key && styles.rowOn]}
              accessible
              accessibilityLabel={`${s.label}: ${format(s.value)}, ${share}`}
            >
              {row}
            </View>
          );
        })}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={[styles.totalText, { flex: 1 }]}>Total</Text>
          <Text style={styles.totalText}>{format(whole)}</Text>
          <Text style={[styles.share, styles.shareCol]}>100%</Text>
          {onOpen ? <View style={styles.chevronCol} /> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ringWrap: { alignSelf: 'center', width: SIZE, height: SIZE, marginVertical: spacing.xs },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: { width: CENTER_WIDTH, alignItems: 'center' },
  centerValue: { ...typography.h4, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  centerLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  centerShare: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  table: { marginTop: spacing.xs },
  headRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  head: { ...typography.overline, color: colors.textTertiary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xxs,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    borderRadius: radius.sm,
  },
  rowOn: { backgroundColor: colors.primaryTint },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  label: { ...typography.bodySm, color: colors.textPrimary },
  dim: { color: colors.textTertiary },
  count: { ...typography.caption, color: colors.textTertiary },
  value: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  share: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  shareCol: { width: 44, textAlign: 'right' },
  chevronCol: { width: 14, alignItems: 'flex-end' },
  totalRow: { borderBottomWidth: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalText: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.md, textAlign: 'center' },
});

export default DonutChart;
