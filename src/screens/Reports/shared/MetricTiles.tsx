// ═══════════════════════════════════════════════════════
// FinMatrix — Headline figures that choose the chart
// ═══════════════════════════════════════════════════════
// The phone's half of the web's MetricTabs. The explorer used to show the same
// figures twice — as tiles, and again as chips to pick what the chart draws.
// Here they are one control: tap a figure and the chart below draws it month
// by month. The chosen one carries a top rule in the brand colour.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';

const { colors, spacing, typography } = THEME;

export interface MetricTile<K extends string = string> {
  key: K;
  label: string;
  value: string;
  caption?: React.ReactNode;
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
        return (
          <TouchableOpacity
            key={it.key}
            style={[styles.tile, i % 2 === 0 && styles.tileLeft, i >= 2 && styles.tileBelow]}
            activeOpacity={0.7}
            onPress={() => onSelect(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${it.label}, ${it.value}. Chart it`}
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
            {it.caption !== undefined ? (
              <Text style={styles.caption} numberOfLines={2}>
                {it.caption}
              </Text>
            ) : null}
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
    paddingBottom: spacing.sm,
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
});

export default MetricTiles;
