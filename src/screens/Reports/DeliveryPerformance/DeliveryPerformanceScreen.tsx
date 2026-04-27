import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchDeliveryPerformance,
  setDeliveryPerformanceRange,
  selectDeliveryPerformanceState,
} from './deliveryPerformanceSlice';
import { getLastNDaysRange } from '../../../models/reportModel';
import type { DeliveryPerformanceRow } from '../../../models/deliveryPerformanceModel';

const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 4;

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 14 Days', days: 14 },
  { label: 'Last 30 Days', days: 30 },
];

type MetricItemProps = { label: string; value: string | number; color: string };

const MetricItem: React.FC<MetricItemProps> = ({ label, value, color }) => (
  <View style={styles.metricItem}>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

type PersonCardProps = { row: DeliveryPerformanceRow };

const PersonCard: React.FC<PersonCardProps> = ({ row }) => {
  const deliveredPct = row.total > 0 ? Math.round((row.delivered / row.total) * 100) : 0;
  const successColor = row.onTimeRate >= 90 ? '#10B981' : '#F59E0B';

  return (
    <View style={styles.personCard}>
      <View style={styles.personHeader}>
        <Text style={styles.personName}>{row.name}</Text>
        <View style={[styles.onTimeBadge, { backgroundColor: `${successColor}20` }]}>
          <Text style={[styles.onTimeBadgeText, { color: successColor }]}>
            {row.onTimeRate}% on-time
          </Text>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <MetricItem label="Total" value={row.total} color={colors.primary} />
        <MetricItem label="Delivered" value={row.delivered} color="#10B981" />
        <MetricItem label="Failed" value={row.failed} color="#EF4444" />
        <MetricItem
          label="Rate"
          value={row.total > 0 ? `${deliveredPct}%` : '—'}
          color="#6366F1"
        />
      </View>
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            { width: `${deliveredPct}%` as `${number}%`, backgroundColor: '#10B981' },
          ]}
        />
      </View>
    </View>
  );
};

const DeliveryPerformanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { report, range, isLoading, error } = useAppSelector(selectDeliveryPerformanceState);
  const [activePeriod, setActivePeriod] = useState(1);

  useEffect(() => {
    dispatch(fetchDeliveryPerformance(range));
  }, [dispatch, range]);

  const handlePeriodChange = (idx: number) => {
    setActivePeriod(idx);
    const newRange = getLastNDaysRange(PERIOD_OPTIONS[idx].days);
    dispatch(setDeliveryPerformanceRange(newRange));
  };

  const barData = useMemo(() => {
    const trend = report?.dailyTrend ?? [];
    if (trend.length === 0) return null;
    return {
      labels: trend.map(p => p.label),
      datasets: [{ data: trend.map(p => p.delivered + p.failed) }],
    };
  }, [report?.dailyTrend]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Performance</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt, idx) => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => handlePeriodChange(idx)}
            style={[styles.periodBtn, activePeriod === idx && styles.periodBtnActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.periodBtnText, activePeriod === idx && styles.periodBtnTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginVertical: spacing.md }}
          />
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {report && (
          <>
            <Text style={styles.sectionTitle}>Personnel Breakdown</Text>
            {report.rows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No assignments found in this period</Text>
              </View>
            ) : (
              report.rows.map(row => <PersonCard key={row.personId} row={row} />)
            )}

            {/* Daily trend bar chart */}
            {barData && barData.labels.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily Activity</Text>
                <BarChart
                  data={barData}
                  width={CHART_WIDTH}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: colors.white,
                    backgroundGradientFrom: colors.white,
                    backgroundGradientTo: colors.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(27,58,92,${opacity})`,
                    labelColor: () => colors.textSecondary,
                    barPercentage: 0.6,
                  }}
                  style={{ borderRadius: borderRadius.sm }}
                  showValuesOnTopOfBars
                />
                <View style={styles.trendLegend}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Total assignments per day</Text>
                  </View>
                </View>
                <View style={styles.trendBreakdownHeader}>
                  <Text style={styles.trendBreakdownLabel}>Date</Text>
                  <Text style={styles.trendBreakdownLabel}>Delivered</Text>
                  <Text style={styles.trendBreakdownLabel}>Failed</Text>
                  <Text style={styles.trendBreakdownLabel}>Total</Text>
                </View>
                {report.dailyTrend.map(pt => (
                  <View key={pt.label} style={styles.trendBreakdownRow}>
                    <Text style={[styles.trendBreakdownCell, { color: colors.textPrimary }]}>
                      {pt.label}
                    </Text>
                    <Text style={[styles.trendBreakdownCell, { color: '#10B981' }]}>
                      {pt.delivered}
                    </Text>
                    <Text style={[styles.trendBreakdownCell, { color: '#EF4444' }]}>
                      {pt.failed}
                    </Text>
                    <Text style={styles.trendBreakdownCell}>{pt.delivered + pt.failed}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  periodBtnTextActive: { color: '#fff', fontWeight: '600' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  personCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  onTimeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.lg,
  },
  onTimeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  metricItem: { alignItems: 'center' },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  trendLegend: { marginTop: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  trendBreakdownHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  trendBreakdownLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: THEME.typography.fontFamily,
  },
  trendBreakdownRow: { flexDirection: 'row', paddingVertical: 4 },
  trendBreakdownCell: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default DeliveryPerformanceScreen;
