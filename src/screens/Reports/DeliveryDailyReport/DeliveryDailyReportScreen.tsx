import React, { useEffect, useMemo } from 'react';
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
import { PieChart } from 'react-native-chart-kit';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchDeliveryDailyReport,
  setDeliveryDailyDate,
  selectDeliveryDailyReportState,
} from './deliveryDailyReportSlice';
import type { DeliveryPersonnelStat } from '../../../models/deliveryDailyReportModel';

const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 4;
const PIE_COLORS = ['#059669', '#00875A', '#6554C0', '#FF991F', '#DE350B'];

const shiftDate = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatDateLabel = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

type StatCardProps = { label: string; value: string; color: string };

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

type PersonRowProps = { stat: DeliveryPersonnelStat; alt: boolean };

const PersonRow: React.FC<PersonRowProps> = ({ stat, alt }) => (
  <View style={[styles.tableRow, alt && styles.tableRowAlt]}>
    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
      {stat.name}
    </Text>
    <Text style={styles.tableCell}>{stat.total}</Text>
    <Text style={[styles.tableCell, { color: '#00875A', fontWeight: '600' }]}>{stat.delivered}</Text>
    <Text
      style={[
        styles.tableCell,
        { color: stat.failed > 0 ? '#DE350B' : colors.textSecondary, fontWeight: '600' },
      ]}
    >
      {stat.failed}
    </Text>
    <Text style={styles.tableCell}>{stat.onTimeRate}%</Text>
  </View>
);

const DeliveryDailyReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { report, date, isLoading, error } = useAppSelector(selectDeliveryDailyReportState);

  useEffect(() => {
    dispatch(fetchDeliveryDailyReport(date));
  }, [dispatch, date]);

  const pieData = useMemo(
    () =>
      (report?.agencyDistribution ?? []).map((item, idx) => ({
        name: item.agencyName.split(' ').slice(0, 2).join(' '),
        population: item.count,
        color: PIE_COLORS[idx % PIE_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 10,
      })),
    [report?.agencyDistribution],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Daily Delivery Report</Text>
      </View>

      {/* Date navigator */}
      <View style={styles.datePicker}>
        <TouchableOpacity
          onPress={() => dispatch(setDeliveryDailyDate(shiftDate(date, -1)))}
          style={styles.dateArrow}
          activeOpacity={0.7}
        >
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDateLabel(date)}</Text>
        <TouchableOpacity
          onPress={() => dispatch(setDeliveryDailyDate(shiftDate(date, 1)))}
          style={styles.dateArrow}
          activeOpacity={0.7}
        >
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
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
            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <StatCard label="Total" value={String(report.total)} color="#2563EB" />
              <StatCard label="Completed" value={String(report.completed)} color="#10B981" />
              <StatCard label="Failed" value={String(report.failed)} color="#EF4444" />
              <StatCard label="On-Time %" value={`${report.onTimePercent}%`} color="#F59E0B" />
            </View>

            {/* Personnel Performance Table */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personnel Performance</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, { flex: 2, textAlign: 'left' }]}>Name</Text>
                <Text style={styles.colHeader}>Total</Text>
                <Text style={styles.colHeader}>Done</Text>
                <Text style={styles.colHeader}>Failed</Text>
                <Text style={styles.colHeader}>On-Time</Text>
              </View>
              {!report.personnelStats || report.personnelStats.length === 0 ? (
                <Text style={styles.emptyText}>No personnel assigned for this date</Text>
              ) : (
                report.personnelStats.map((p, idx) => (
                  <PersonRow key={p.personId} stat={p} alt={idx % 2 === 1} />
                ))
              )}
            </View>

            {/* Agency Distribution Pie */}
            {(report.agencyDistribution?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Agency Distribution</Text>
                <PieChart
                  data={pieData}
                  width={CHART_WIDTH}
                  height={200}
                  chartConfig={{
                    backgroundColor: colors.white,
                    backgroundGradientFrom: colors.white,
                    backgroundGradientTo: colors.white,
                    color: (opacity = 1) => `rgba(37,99,235,${opacity})`,
                    labelColor: () => colors.textSecondary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  absolute
                />
              </View>
            )}

            {report.total === 0 && (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No deliveries scheduled for this date</Text>
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
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateArrow: { padding: spacing.xs },
  dateArrowText: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  errorText: {
    fontSize: 13,
    color: '#DE350B',
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 3,
    ...shadows.small,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  colHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default DeliveryDailyReportScreen;
