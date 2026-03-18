import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
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

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const ProfitLossScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectProfitLossState);

  useEffect(() => {
    dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }));
  }, [dispatch, state.range.startDate, state.range.endDate, state.comparisonEnabled]);

  const report = state.report;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profit & Loss</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Date Range (YYYY-MM-DD)</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={state.range.startDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, startDate: text }))}
              placeholder="Start"
              placeholderTextColor={colors.textLight}
            />
            <TextInput
              style={styles.input}
              value={state.range.endDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, endDate: text }))}
              placeholder="End"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show comparison period</Text>
            <Switch
              value={state.comparisonEnabled}
              onValueChange={value => {
                dispatch(setProfitLossComparisonEnabled(value));
              }}
              trackColor={{ false: '#CBD5E1', true: colors.primary + '66' }}
              thumbColor={state.comparisonEnabled ? colors.primary : '#F8FAFC'}
            />
          </View>
        </View>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {report && (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headCell, styles.metricCol]}>Metric</Text>
              <Text style={styles.headCell}>Current</Text>
              {state.comparisonEnabled && <Text style={styles.headCell}>Comparison</Text>}
            </View>

            <Row
              label="Revenue"
              current={report.revenue}
              comparison={report.comparison?.revenue}
              showComparison={state.comparisonEnabled}
            />
            <Row
              label="COGS"
              current={report.cogs}
              comparison={report.comparison?.cogs}
              showComparison={state.comparisonEnabled}
            />
            <Row
              label="Gross Profit"
              current={report.grossProfit}
              comparison={report.comparison?.grossProfit}
              showComparison={state.comparisonEnabled}
              strong
            />
            <Row
              label="Expenses"
              current={report.expenses}
              comparison={report.comparison?.expenses}
              showComparison={state.comparisonEnabled}
            />
            <Row
              label="Net Income"
              current={report.netIncome}
              comparison={report.comparison?.netIncome}
              showComparison={state.comparisonEnabled}
              strong
              highlight
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Row: React.FC<{
  label: string;
  current: number;
  comparison?: number;
  showComparison: boolean;
  strong?: boolean;
  highlight?: boolean;
}> = ({ label, current, comparison, showComparison, strong, highlight }) => {
  const textStyle = [styles.bodyCell, strong && styles.strongText, highlight && styles.highlightText];
  return (
    <View style={styles.tableRow}>
      <Text style={[textStyle, styles.metricCol]}>{label}</Text>
      <Text style={textStyle}>{formatCurrency(current, 'Rs ')}</Text>
      {showComparison && <Text style={textStyle}>{formatCurrency(comparison ?? 0, 'Rs ')}</Text>}
    </View>
  );
};

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
  content: { padding: spacing.md, gap: spacing.md },
  filterCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  filterTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    backgroundColor: '#F8FAFC',
  },
  switchRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.small,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: THEME.typography.fontFamily,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  bodyCell: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  metricCol: { flex: 1.4 },
  strongText: { fontWeight: '700' },
  highlightText: { color: '#0F766E' },
});

export default ProfitLossScreen;
