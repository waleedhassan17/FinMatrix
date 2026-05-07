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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchAnalyticsDashboard, selectAnalyticsDashboardState } from './analyticsDashboardSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import { formatCurrency } from '../../../utils/formatters';

type AnalyticsDashboardScreenProps = NativeStackScreenProps<ReportsStackParamList, 'AnalyticsDashboard'>;

const CHART_WIDTH = Dimensions.get('window').width - spacing.md * 2 - spacing.md * 2;
const PIE_COLORS = ['#1D4ED8', '#0EA5E9', '#10B981', '#F59E0B', '#F97316', '#EF4444'];

const AnalyticsDashboardScreen: React.FC<AnalyticsDashboardScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAnalyticsDashboardState);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  useEffect(() => {
    dispatch(fetchAnalyticsDashboard());
  }, [dispatch]);

  const data = state.data;
  const revenueTrend = Array.isArray(data?.revenueTrend) ? data.revenueTrend : [];
  const cashFlowTrend = Array.isArray(data?.cashFlowTrend) ? data.cashFlowTrend : [];
  const topCustomers = Array.isArray(data?.topCustomers) ? data.topCustomers : [];
  const arAgingTrend = Array.isArray(data?.arAgingTrend) ? data.arAgingTrend : [];
  const expenseCategories = Array.isArray(data?.expenseCategories) ? data.expenseCategories : [];
  const safeRevenueTrend = revenueTrend.filter(point => Number.isFinite(point.value));
  const safeCashFlowTrend = cashFlowTrend.filter(point => Number.isFinite(point.value));
  const safeTopCustomers = topCustomers.filter(customer => Number.isFinite(customer.value));
  const safeArAgingTrend = arAgingTrend.filter(point =>
    [point.current, point.bucket1to30, point.bucket31to60, point.bucket61to90, point.bucket90Plus].every(value =>
      Number.isFinite(value),
    ),
  );

  const pieData = useMemo(
    () =>
      expenseCategories.map((item, idx) => ({
        name: item.label,
        amount: item.value,
        color: PIE_COLORS[idx % PIE_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      })),
    [expenseCategories],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analytics Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {data && (
          <>
            <Card title="Revenue Trend (Last 6 Months)">
              {safeRevenueTrend.length > 0 ? (
                <LineChart
                  data={{
                    labels: safeRevenueTrend.map(point => point.label),
                    datasets: [{ data: safeRevenueTrend.map(point => point.value) }],
                  }}
                  width={CHART_WIDTH}
                  height={220}
                  yAxisLabel="Rs "
                  yAxisSuffix=""
                  bezier
                  chartConfig={chartConfig('#2563EB', '#93C5FD')}
                  style={styles.chart}
                  onDataPointClick={payload => {
                    setSelectedCustomer(`Revenue ${safeRevenueTrend[payload.index]?.label ?? ''}: ${formatCurrency(payload.value, 'Rs ')}`);
                  }}
                />
              ) : (
                <Text style={styles.emptyText}>No revenue trend data available.</Text>
              )}
              {!!selectedCustomer && <Text style={styles.selectionText}>{selectedCustomer}</Text>}
            </Card>

            <Card title="Expense Categories">
              {pieData.length > 0 ? (
                <PieChart
                  data={pieData}
                  width={CHART_WIDTH}
                  height={220}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="8"
                  absolute
                  chartConfig={{
                    color: () => colors.textPrimary,
                    labelColor: () => colors.textSecondary,
                  }}
                />
              ) : (
                <Text style={styles.emptyText}>No expense category data available.</Text>
              )}
            </Card>

            <Card title="Cash Flow (Last 6 Months)">
              {safeCashFlowTrend.length > 0 ? (
                <LineChart
                  data={{
                    labels: safeCashFlowTrend.map(point => point.label),
                    datasets: [{ data: safeCashFlowTrend.map(point => point.value) }],
                  }}
                  width={CHART_WIDTH}
                  height={220}
                  yAxisLabel="Rs "
                  bezier
                  chartConfig={chartConfig('#059669', '#A7F3D0')}
                  style={styles.chart}
                />
              ) : (
                <Text style={styles.emptyText}>No cash flow data available.</Text>
              )}
            </Card>

            <Card title="Top 5 Customers">
              {safeTopCustomers.length > 0 ? (
                <View style={styles.barsWrap}>
                  {safeTopCustomers.map(customer => {
                    const max = Math.max(...safeTopCustomers.map(item => item.value), 1);
                  const widthPct = (customer.value / max) * 100;
                  const active = selectedCustomer === customer.label;
                  return (
                    <TouchableOpacity
                      key={customer.label}
                      activeOpacity={0.75}
                      onPress={() => setSelectedCustomer(customer.label)}
                      style={styles.barRow}
                    >
                      <Text style={styles.barLabel}>{customer.label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${widthPct}%` }, active && styles.barFillActive]} />
                      </View>
                      <Text style={styles.barValue}>{formatCurrency(customer.value, 'Rs ')}</Text>
                    </TouchableOpacity>
                  );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No customer ranking data available.</Text>
              )}
            </Card>

            <Card title="AR Aging (Stacked)">
              {safeArAgingTrend.length > 0 ? (
                <>
                  <View style={styles.stackWrap}>
                    {safeArAgingTrend.map(point => {
                      const total =
                        point.current +
                        point.bucket1to30 +
                        point.bucket31to60 +
                        point.bucket61to90 +
                        point.bucket90Plus;
                      const h = 130;
                      const safeTotal = Math.max(1, total);
                      return (
                        <View key={point.label} style={styles.stackCol}>
                          <View style={[styles.stackSegment, { height: (point.bucket90Plus / safeTotal) * h, backgroundColor: '#DC2626' }]} />
                          <View style={[styles.stackSegment, { height: (point.bucket61to90 / safeTotal) * h, backgroundColor: '#F97316' }]} />
                          <View style={[styles.stackSegment, { height: (point.bucket31to60 / safeTotal) * h, backgroundColor: '#F59E0B' }]} />
                          <View style={[styles.stackSegment, { height: (point.bucket1to30 / safeTotal) * h, backgroundColor: '#0EA5E9' }]} />
                          <View style={[styles.stackSegment, { height: (point.current / safeTotal) * h, backgroundColor: '#10B981' }]} />
                          <Text style={styles.stackLabel}>{point.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.legendText}>Green: Current | Blue: 1-30 | Amber: 31-60 | Orange: 61-90 | Red: 90+</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>No AR aging data available.</Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const chartConfig = (lineColor: string, fillColor: string) => ({
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: () => lineColor,
  labelColor: () => '#475569',
  fillShadowGradient: fillColor,
  fillShadowGradientOpacity: 0.35,
  propsForDots: {
    r: '3',
    strokeWidth: '1',
    stroke: lineColor,
  },
});

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  chart: {
    borderRadius: borderRadius.sm,
  },
  selectionText: {
    marginTop: spacing.sm,
    color: '#0F766E',
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily,
  },
  barsWrap: { gap: spacing.sm },
  barRow: {
    gap: spacing.xs,
  },
  barLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  barTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#38BDF8',
  },
  barFillActive: {
    backgroundColor: '#0EA5E9',
  },
  barValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  stackWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.xs,
    minHeight: 170,
  },
  stackCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  stackSegment: {
    width: 24,
  },
  stackLabel: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  legendText: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
});

export default AnalyticsDashboardScreen;
