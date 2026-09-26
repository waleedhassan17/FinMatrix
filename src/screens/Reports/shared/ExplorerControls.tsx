// ═══════════════════════════════════════════════════════
// FinMatrix — Item explorer controls
// ═══════════════════════════════════════════════════════
// Which metric to chart, and whether as columns or a line. The web lays the
// metrics out as two rows of pills; a phone scrolls one row sideways, grouped
// the same way (Sales, then Stock), so every choice is still in reach.

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  EXPLORER_METRICS,
  METRIC_GROUPS,
  type ExplorerMetricKey,
} from '../../../models/itemExplorerModel';
import type { ChartType } from './MetricChart';
import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

export const MetricChips: React.FC<{
  value: ExplorerMetricKey;
  onChange: (key: ExplorerMetricKey) => void;
  /** Metrics with nothing to draw: shown, not choosable. */
  disabled?: readonly ExplorerMetricKey[];
}> = ({ value, onChange, disabled = [] }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    {METRIC_GROUPS.map((g, gi) => (
      <View key={g.key} style={styles.group}>
        <Text style={[styles.groupLabel, gi > 0 && styles.groupLabelSpaced]}>{g.label}</Text>
        {EXPLORER_METRICS.filter(m => m.group === g.key).map(m => {
          const on = m.key === value;
          const off = disabled.includes(m.key);
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.chip, on && styles.chipOn, off && styles.chipOff]}
              activeOpacity={0.8}
              disabled={off}
              onPress={() => onChange(m.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: off }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ))}
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
  group: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  groupLabel: { ...typography.overline, color: colors.textTertiary },
  groupLabelSpaced: { marginLeft: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
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
