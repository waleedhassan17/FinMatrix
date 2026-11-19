// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · activity by hour
// ═══════════════════════════════════════════════════════
// When the day happened: sales and receipts by the hour they were entered,
// two thin bars an hour. A shop sees its rush hours. Mirrors the website's
// HourlyActivity.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { SectionCard } from '../../../components/reports/ReportUI';
import { compactMoney } from '../../../models/itemExplorerModel';
import { busiestHour, hourTick, hourWindow, type DayHourRow } from '../../../models/daySummaryModel';

const { colors, spacing, typography } = THEME;

const HourlyActivity: React.FC<{ hourly: DayHourRow[] }> = ({ hourly }) => {
  const hours = hourWindow(hourly);
  const max = Math.max(...hours.map(h => Math.max(h.sales, h.received)), 0);
  const peak = busiestHour(hourly);
  return (
    <SectionCard
      title="Activity by hour"
      icon="clock"
      subtitle={
        peak
          ? `Busiest at ${hourTick(peak.hour)} · ${compactMoney(peak.sales)} sales`
          : 'When sales and receipts were entered'
      }
    >
      {max === 0 ? (
        <Text style={styles.empty}>No sales or receipts were entered on this day.</Text>
      ) : (
        <View
          accessible
          accessibilityLabel={`Sales and money received by hour. ${peak ? `Busiest at ${hourTick(peak.hour)}.` : ''}`}
        >
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Sales</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Received</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {hours.map(h => (
              <View key={h.hour} style={styles.hour}>
                <View style={[styles.bar, { height: `${(h.sales / max) * 100}%`, backgroundColor: colors.primary }]} />
                <View style={[styles.bar, { height: `${(h.received / max) * 100}%`, backgroundColor: colors.success }]} />
              </View>
            ))}
          </View>
          {/* Every fourth hour, placed along the axis: a label squeezed into
              one hour's column would be clipped to "1…". */}
          <View style={styles.ticks}>
            {hours.map((h, i) =>
              h.hour % 4 === 0 ? (
                <Text key={h.hour} style={[styles.tick, { left: `${(i / hours.length) * 100}%` }]} numberOfLines={1}>
                  {hourTick(h.hour)}
                </Text>
              ) : null,
            )}
          </View>
        </View>
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  empty: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  legendText: { ...typography.caption, color: colors.textSecondary },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hour: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  bar: { flex: 1, maxWidth: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  ticks: { height: 18, marginTop: 3 },
  tick: { ...typography.caption, color: colors.textTertiary, position: 'absolute', top: 0, width: 48 },
});

export default HourlyActivity;
