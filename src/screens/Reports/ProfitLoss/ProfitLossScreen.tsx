import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchProfitLossReport,
  selectProfitLossState,
  setProfitLossComparisonEnabled,
  setProfitLossRange,
} from './profitLossSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  DateField,
  SummaryLine,
  LoadingBlock,
  ErrorBlock,
  ACCENT,
  reportContentStyle,
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

const ProfitLossScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectProfitLossState);

  useEffect(() => {
    dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }));
  }, [dispatch, state.range.startDate, state.range.endDate, state.comparisonEnabled]);

  const report = state.report;
  const netPositive = (report?.netIncome ?? 0) >= 0;

  return (
    <ReportContainer>
      <ReportHeader
        title="Profit & Loss"
        subtitle="Income statement"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {/* Filter */}
        <Card>
          <View style={styles.filterRow}>
            <DateField
              label="From"
              value={state.range.startDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, startDate: text }))}
            />
            <DateField
              label="To"
              value={state.range.endDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, endDate: text }))}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Compare with prior period</Text>
            <Switch
              value={state.comparisonEnabled}
              onValueChange={value => {
                dispatch(setProfitLossComparisonEnabled(value));
              }}
              trackColor={{ false: THEME.colors.neutral200, true: THEME.colors.primary + '66' }}
              thumbColor={state.comparisonEnabled ? THEME.colors.primary : '#F8FAFC'}
            />
          </View>
        </Card>

        {state.isLoading && <LoadingBlock label="Calculating profit & loss…" />}
        {!!state.error && (
          <ErrorBlock
            message={state.error}
            onRetry={() =>
              dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }))
            }
          />
        )}

        {report && !state.isLoading && (
          <>
            {/* Headline KPIs */}
            <KpiGrid
              items={[
                { label: 'Revenue', value: rs(report.revenue), accent: ACCENT.brand, icon: 'trending-up' },
                { label: 'Gross Profit', value: rs(report.grossProfit), accent: ACCENT.blue, icon: 'bar-chart-2' },
                { label: 'Expenses', value: rs(report.expenses), accent: ACCENT.amber, icon: 'arrow-down-circle' },
                {
                  label: 'Net Income',
                  value: rs(report.netIncome),
                  accent: netPositive ? ACCENT.green : ACCENT.red,
                  icon: 'dollar-sign',
                },
              ]}
            />

            {/* Breakdown */}
            <SectionCard title="Statement" subtitle={state.comparisonEnabled ? 'Current vs prior period' : undefined} icon="file-text">
              <View style={styles.headRow}>
                <Text style={[styles.colMetric, styles.headText]}>Metric</Text>
                <Text style={[styles.colVal, styles.headText]}>Current</Text>
                {state.comparisonEnabled && <Text style={[styles.colVal, styles.headText]}>Prior</Text>}
              </View>
              <Line label="Revenue" current={report.revenue} prior={report.comparison?.revenue} show={state.comparisonEnabled} />
              <Line label="COGS" current={report.cogs} prior={report.comparison?.cogs} show={state.comparisonEnabled} />
              <Line label="Gross Profit" current={report.grossProfit} prior={report.comparison?.grossProfit} show={state.comparisonEnabled} strong />
              <Line label="Expenses" current={report.expenses} prior={report.comparison?.expenses} show={state.comparisonEnabled} />
              <View style={styles.netWrap}>
                <SummaryLine
                  label="Net Income"
                  value={rs(report.netIncome)}
                  strong
                  highlight
                  valueColor={netPositive ? THEME.colors.success : THEME.colors.danger}
                />
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const Line: React.FC<{ label: string; current: number; prior?: number; show: boolean; strong?: boolean }> = ({
  label,
  current,
  prior,
  show,
  strong,
}) => (
  <View style={styles.bodyRow}>
    <Text style={[styles.colMetric, styles.bodyText, strong && styles.bold]}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.colVal, styles.bodyText, strong && styles.bold]}>{rs(current)}</Text>
    {show && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.colVal, styles.bodyText, strong && styles.bold]}>{rs(prior ?? 0)}</Text>}
  </View>
);

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  switchRow: {
    marginTop: THEME.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary },

  headRow: {
    gap: 10,
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  headText: { ...THEME.typography.labelMd, color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  bodyRow: {
    gap: 10,
    flexDirection: 'row',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderLight,
  },
  bodyText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
  colMetric: { flex: 1.4 },
  colVal: { flex: 1, textAlign: 'right' },
  bold: { fontWeight: '700' },
  netWrap: { marginTop: 4 },
});

export default ProfitLossScreen;
