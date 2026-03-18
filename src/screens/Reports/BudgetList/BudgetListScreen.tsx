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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchBudgetList, selectBudgetListState } from './budgetListSlice';
import EmptyState from '../../../components/EmptyState';
import { calculateBudgetTotal } from '../../../models/budgetModel';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const BudgetListScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBudgetListState);

  useEffect(() => {
    dispatch(fetchBudgetList());
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Annual Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('BudgetForm', { fiscalYear: new Date().getFullYear() })}
        >
          <Text style={styles.createBtnText}>+ Create Budget</Text>
        </TouchableOpacity>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && !state.isLoading && (
          <EmptyState
            title="Failed to Load"
            message={state.error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchBudgetList())}
          />
        )}

        {!state.isLoading && !state.error && state.budgets.length === 0 && (
          <EmptyState
            title="No Budgets Yet"
            message="Create your first annual budget to start tracking."
          />
        )}

        {state.budgets.map(budget => (
          <View key={budget.id} style={styles.card}>
            <Text style={styles.cardTitle}>{budget.name}</Text>
            <Text style={styles.cardMeta}>Fiscal Year: {budget.fiscalYear}</Text>
            <Text style={styles.cardMeta}>Accounts: {budget.lines.length}</Text>
            <Text style={styles.cardValue}>{formatCurrency(calculateBudgetTotal(budget.lines), 'Rs ')}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BudgetForm', { budgetId: budget.id, fiscalYear: budget.fiscalYear })}
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BudgetComparison', { budgetId: budget.id })}
              >
                <Text style={[styles.actionText, styles.actionTextSecondary]}>Compare</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  createBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  cardMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  cardValue: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F766E',
    fontFamily: THEME.typography.fontFamily,
  },
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionBtnSecondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  actionTextSecondary: {
    color: '#1D4ED8',
  },
});

export default BudgetListScreen;
