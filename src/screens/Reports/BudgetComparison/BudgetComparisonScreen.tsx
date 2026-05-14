import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBudgetComparison,
  selectBudgetComparisonState,
  setBudgetComparisonBudgetId,
} from './budgetComparisonSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import { formatCurrency } from '../../../utils/formatters';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;
type BudgetComparisonRoute = RouteProp<ReportsStackParamList, 'BudgetComparison'>;

const BudgetComparisonScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const route = useRoute<BudgetComparisonRoute>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBudgetComparisonState);

  useEffect(() => {
    const budgetId = route.params?.budgetId;
    if (!budgetId) return;
    dispatch(setBudgetComparisonBudgetId(budgetId));
    dispatch(fetchBudgetComparison(budgetId));
  }, [dispatch, route.params?.budgetId]);

  const comparison = state.comparison;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Budgets</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Budget vs Actual</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {comparison && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>FY {comparison.fiscalYear}</Text>
              <Text style={styles.summaryValue}>Budget: {formatCurrency(comparison.totals.budget, 'Rs ')}</Text>
              <Text style={styles.summaryValue}>Actual: {formatCurrency(comparison.totals.actual, 'Rs ')}</Text>
              <Text style={[styles.summaryVariance, comparison.totals.variance >= 0 ? styles.negative : styles.positive]}>
                Variance: {formatCurrency(comparison.totals.variance, 'Rs ')} ({comparison.totals.variancePct.toFixed(1)}%)
              </Text>
            </View>

            <View style={styles.tableCard}>
              {comparison.rows.map(row => {
                const max = Math.max(row.budget, row.actual, 1);
                const budgetWidth = (row.budget / max) * 100;
                const actualWidth = (row.actual / max) * 100;
                const positiveVariance = row.variance <= 0;

                return (
                  <View key={row.lineId} style={styles.rowCard}>
                    <Text style={styles.account}>{row.accountCode} - {row.accountName}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barBudget, { width: `${budgetWidth}%` }]} />
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barActual, { width: `${actualWidth}%` }]} />
                    </View>

                    <View style={styles.metricsRow}>
                      <Text style={styles.metricText}>Budget: {formatCurrency(row.budget, 'Rs ')}</Text>
                      <Text style={styles.metricText}>Actual: {formatCurrency(row.actual, 'Rs ')}</Text>
                    </View>
                    <Text style={[styles.varianceText, positiveVariance ? styles.positive : styles.negative]}>
                      Variance: {formatCurrency(row.variance, 'Rs ')} ({row.variancePct.toFixed(1)}%)
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.legend}>Blue = Budget, Green = Actual</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryVariance: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  rowCard: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  account: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  barTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  barBudget: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  barActual: {
    height: '100%',
    backgroundColor: '#00875A',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metricText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  varianceText: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  positive: { color: '#059669' },
  negative: { color: '#DE350B' },
  legend: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default BudgetComparisonScreen;
