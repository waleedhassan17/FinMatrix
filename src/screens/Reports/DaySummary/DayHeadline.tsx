// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · headline
// ═══════════════════════════════════════════════════════
// The day in four figures — sales, money received, orders booked, purchases —
// each with its count, a pill for the move against the comparison day, and
// the week to this day as seven bars (this day solid). Two across on a phone;
// the same anatomy as the website's KPI cards. Own file so it is tested alone.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import { compactMoney } from '../../../models/itemExplorerModel';
import {
  compareLabel,
  comparedFigure,
  countLabel,
  dayChange,
  dayShortLabel,
  weekdayInitials,
  type CompareKey,
  type DayDocKind,
  type DayKpi,
  type DaySummary,
} from '../../../models/daySummaryModel';

const { colors, radius, shadows, spacing, typography } = THEME;

interface Item {
  key: string;
  label: string;
  kpi: DayKpi;
  kind: DayDocKind;
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  tintBg: string;
  /** Up is good news; null when the move is just a fact (purchases). */
  upIsGood: boolean | null;
}

export const headlineItems = (s: DaySummary): Item[] => [
  {
    key: 'sales',
    label: 'Sales',
    kpi: s.headline.sales,
    kind: 'invoice',
    icon: 'file-text',
    tint: colors.primary,
    tintBg: colors.primaryTint,
    upIsGood: true,
  },
  {
    key: 'received',
    label: 'Received',
    kpi: s.headline.received,
    kind: 'receipt',
    icon: 'download',
    tint: colors.success,
    tintBg: colors.successLighter,
    upIsGood: true,
  },
  ...(s.headline.orders
    ? [
        {
          key: 'orders',
          label: 'Orders booked',
          kpi: s.headline.orders,
          kind: 'sales_order' as const,
          icon: 'clipboard' as const,
          tint: colors.info,
          tintBg: colors.infoLight,
          upIsGood: true,
        },
      ]
    : []),
  {
    key: 'purchases',
    label: 'Purchases',
    kpi: s.headline.purchases,
    kind: 'bill',
    icon: 'shopping-cart',
    tint: colors.warning,
    tintBg: colors.warningLighter,
    upIsGood: null,
  },
];

/** "+45%" in a tinted pill: green good news, red bad, grey a plain fact. */
export const DeltaPill: React.FC<{ text: string; up: boolean; upIsGood: boolean | null }> = ({ text, up, upIsGood }) => {
  const tone =
    upIsGood === null
      ? { fg: colors.textSecondary, bg: colors.neutral100 }
      : up === upIsGood
        ? { fg: colors.success, bg: colors.successLighter }
        : { fg: colors.danger, bg: colors.dangerLighter };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      {text !== 'New' ? <Feather name={up ? 'arrow-up-right' : 'arrow-down-right'} size={11} color={tone.fg} /> : null}
      <Text style={[styles.pillText, { color: tone.fg }]}>{text}</Text>
    </View>
  );
};

/** The week to this day as seven bars, this day solid. */
export const WeekBars: React.FC<{ values: number[]; dates: string[]; label: string }> = ({ values, dates, label }) => {
  const max = Math.max(...values, 0);
  return (
    <View
      style={styles.week}
      accessible
      accessibilityLabel={`${label}, last 7 days: ${values.map((v, i) => `${dayShortLabel(dates[i] ?? '')} ${compactMoney(v)}`).join(', ')}`}
    >
      <View style={styles.bars}>
        {values.map((v, i) => {
          const last = i === values.length - 1;
          const pct = max > 0 ? Math.max(4, (v / max) * 100) : 4;
          return (
            <View
              key={dates[i] ?? i}
              style={[
                styles.bar,
                { height: `${pct}%` },
                { backgroundColor: last ? colors.primary : v > 0 ? colors.navy200 : colors.borderLight },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.days}>
        {dates.map((d, i) => (
          <Text key={d} style={[styles.dayText, i === dates.length - 1 && styles.dayTextToday]}>
            {weekdayInitials(d)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const DayHeadline: React.FC<{ summary: DaySummary; compare: CompareKey }> = ({ summary, compare }) => (
  <View style={styles.grid}>
    {headlineItems(summary).map((item, i, all) => {
      const prior = comparedFigure(item.kpi, compare);
      const change = dayChange(item.kpi.total, prior.total);
      // An odd one out spans the row rather than leaving half of it empty.
      const alone = all.length % 2 === 1 && i === all.length - 1;
      return (
        <View
          key={item.key}
          style={[styles.tile, alone && styles.tileWide]}
          accessible
          accessibilityLabel={`${item.label} ${formatCurrency(item.kpi.total)}, ${countLabel(item.kpi.count, item.kind)}${change ? `, ${change.text} ${compareLabel(compare)}` : ''}`}
        >
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: item.tintBg }]}>
              <Feather name={item.icon} size={13} color={item.tint} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrency(item.kpi.total)}
          </Text>
          <View style={styles.subRow}>
            <Text style={styles.caption} numberOfLines={1}>
              {countLabel(item.kpi.count, item.kind)}
            </Text>
            {change ? <DeltaPill text={change.text} up={change.up} upIsGood={item.upIsGood} /> : null}
          </View>
          <Text style={styles.vs} numberOfLines={1}>
            {compactMoney(prior.total)} {compareLabel(compare).replace(/^vs /, '')}
          </Text>
          <WeekBars values={item.kpi.trend} dates={summary.trendDates} label={item.label} />
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadows.card,
  },
  tileWide: { width: '100%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { width: 24, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.labelSm, color: colors.textSecondary, flex: 1 },
  value: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xs },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xxs, marginTop: 2 },
  caption: { ...typography.caption, color: colors.textTertiary, flexShrink: 1 },
  vs: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillText: { ...typography.labelSm },
  week: { marginTop: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 36, gap: 3 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  days: { flexDirection: 'row', gap: 3, marginTop: 3 },
  dayText: { ...typography.caption, color: colors.textTertiary, flex: 1, textAlign: 'center' },
  dayTextToday: { color: colors.textPrimary },
});

export default DayHeadline;
