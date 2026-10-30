// ═══════════════════════════════════════════════════════
// FinMatrix — Headline figures that choose the chart
// ═══════════════════════════════════════════════════════
// The phone's half of the web's MetricTabs. The explorer used to show the same
// figures twice — as tiles, and again as chips to pick what the chart draws.
// Here they are one control: tap a figure and the chart below draws it month
// by month. The chosen one carries a top rule in the brand colour.
//
// Every tile has the same parts in the same places — figure, change, shape —
// so the four read evenly whether or not there is a change to show. The
// shapes are grey except the chosen figure's, so the colour points at what
// the chart is drawing.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';
import Sparkline from '../../../components/reports/Sparkline';

const { colors, spacing, typography } = THEME;

export interface MetricTile<K extends string = string> {
  key: K;
  label: string;
  value: string;
  /**
   * Its move against the window before — "+12.4%" — and whether that is good
   * news. The comparison itself is named once, beside the window.
   */
  change?: { text: string; tone: 'good' | 'bad' | null } | null;
  /** One line under it, when there is no change to show — "No sales in this window". */
  caption?: React.ReactNode;
  /** The figure month by month, oldest first: its shape, under the figure. */
  trend?: (number | null)[];
  danger?: boolean;
}

interface Props<K extends string> {
  items: MetricTile<K>[];
  /** May name none of them — a metric chosen from "More metrics". */
  selected: K | null;
  onSelect: (key: K) => void;
}

function MetricTiles<K extends string>({ items, selected, onSelect }: Props<K>) {
  return (
    <View style={styles.grid} accessibilityRole="tablist">
      {items.map((it, i) => {
        const on = it.key === selected;
        const change = it.change;
        return (
          <TouchableOpacity
            key={it.key}
            style={[styles.tile, i % 2 === 0 && styles.tileLeft, i >= 2 && styles.tileBelow]}
            activeOpacity={0.7}
            onPress={() => onSelect(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${it.label}, ${it.value}${change ? `, ${change.text}` : ''}. Chart it`}
          >
            <View style={[styles.rule, on && styles.ruleOn]} />
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {it.label}
            </Text>
            <Text
              style={[styles.value, it.danger && styles.valueDanger]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {it.value}
            </Text>
            {/* Always a line, so the shapes below line up across the row. */}
            <Text style={styles.caption} numberOfLines={2}>
              {change ? (
                <Text
                  style={[
                    styles.change,
                    change.tone === 'good' && styles.good,
                    change.tone === 'bad' && styles.bad,
                  ]}
                >
                  {change.tone === 'good' ? '▲ ' : change.tone === 'bad' ? '▼ ' : ''}
                  {change.text}
                </Text>
              ) : (
                (it.caption ?? ' ')
              )}
            </Text>
            <View style={styles.trend}>
              {it.trend ? (
                <Sparkline
                  decorative
                  values={it.trend}
                  label={`${it.label} by month`}
                  color={on ? colors.primary : colors.neutral400}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: '50%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  tileLeft: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.borderLight },
  tileBelow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  rule: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'transparent' },
  ruleOn: { backgroundColor: colors.primary },
  label: { ...typography.labelSm, color: colors.textSecondary },
  labelOn: { color: colors.primary },
  value: { ...typography.h4, color: colors.textPrimary, marginTop: 2 },
  valueDanger: { color: colors.danger },
  caption: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  change: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  good: { color: colors.success },
  bad: { color: colors.danger },
  // A fixed height, drawn or not, so every tile in a row is the same size.
  trend: { height: 34, justifyContent: 'flex-end' },
});

export default MetricTiles;
