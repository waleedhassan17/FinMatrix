// ═══════════════════════════════════════════════════════
// FinMatrix — Item explorer controls
// ═══════════════════════════════════════════════════════
// Which metric to chart, and whether as columns or a line. The four headline
// figures choose themselves (MetricTiles); the other six sit in one short row
// here, beside nothing else, so the chart card stays quiet.

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { EXPLORER_METRICS, type ExplorerMetricKey } from '../../../models/itemExplorerModel';
import type { ChartType } from './MetricChart';
import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

/**
 * The metrics that are not headline figures, in one short row. The headline
 * four are chosen from the figure tiles above the chart; these are the rest.
 */
export const MetricChips: React.FC<{
  metrics: readonly ExplorerMetricKey[];
  value: ExplorerMetricKey;
  onChange: (key: ExplorerMetricKey) => void;
  /** Metrics with nothing to draw: shown, not choosable. */
  disabled?: readonly ExplorerMetricKey[];
}> = ({ metrics, value, onChange, disabled = [] }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    <Text style={styles.groupLabel}>More</Text>
    {metrics.map(key => {
      const m = EXPLORER_METRICS.find(x => x.key === key)!;
      const on = key === value;
      const off = disabled.includes(key);
      return (
        <TouchableOpacity
          key={key}
          style={[styles.chip, on && styles.chipOn, off && styles.chipOff]}
          activeOpacity={0.8}
          disabled={off}
          onPress={() => onChange(key)}
          accessibilityRole="button"
          accessibilityState={{ selected: on, disabled: off }}
        >
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

export const ChartTypeToggle: React.FC<{
  value: ChartType;
  onChange: (type: ChartType) => void;
}> = ({ value, onChange }) => (
  <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel="Chart type">
    {(
      [
        { key: 'bar', icon: 'bar-chart-2', label: 'Bar' },
        { key: 'line', icon: 'activity', label: 'Line' },
      ] as const
    ).map((o, i) => {
      const on = value === o.key;
      return (
        <TouchableOpacity
          key={o.key}
          style={[styles.toggleBtn, i > 0 && styles.toggleBtnRule, on && styles.toggleBtnOn]}
          activeOpacity={0.8}
          onPress={() => onChange(o.key)}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`${o.label} chart`}
        >
          <Feather name={o.icon} size={14} color={on ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  chips: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxs },
  groupLabel: { ...typography.overline, color: colors.textTertiary },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipOff: { opacity: 0.45 },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.textInverse },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  toggleBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  toggleBtnRule: { borderLeftWidth: 1, borderLeftColor: colors.border },
  toggleBtnOn: { backgroundColor: colors.primaryLight },
});
