import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  addBudgetLineByAccount,
  copyFromLastYear,
  distributeBudgetLineEvenly,
  initializeBudgetDraft,
  loadBudgetForEdit,
  saveBudget,
  selectBudgetFormMonths,
  selectBudgetFormState,
  setBudgetLineMonthAmount,
} from './budgetFormSlice';
import { chartOfAccountsData } from '../../../models/coaModel';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import { formatCurrency } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;
type BudgetFormRoute = RouteProp<ReportsStackParamList, 'BudgetForm'>;

const BudgetFormScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const route = useRoute<BudgetFormRoute>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBudgetFormState);
  const months = useAppSelector(selectBudgetFormMonths);

  useEffect(() => {
    if (route.params?.budgetId) {
      dispatch(loadBudgetForEdit(route.params.budgetId));
      return;
    }

    const fiscalYear = route.params?.fiscalYear ?? new Date().getFullYear();
    dispatch(initializeBudgetDraft({ fiscalYear }));
  }, [dispatch, route.params?.budgetId, route.params?.fiscalYear]);

  const budget = state.budget;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Budgets</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Budget Form</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {budget && (
          <>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>{budget.name}</Text>
              <Text style={styles.metaText}>Fiscal Year: {budget.fiscalYear}</Text>
              <Text style={styles.metaText}>Accounts: {budget.lines.length}</Text>

              <View style={styles.actionRow}>
                <CustomButton
                  title="Copy Last Year"
                  onPress={() => dispatch(copyFromLastYear(budget.fiscalYear))}
                  variant="secondary"
                  size="sm"
                />
                <CustomButton
                  title="Save Budget"
                  onPress={async () => {
                    await dispatch(saveBudget(budget));
                    Alert.alert('Saved', 'Budget saved successfully.');
                  }}
                  variant="primary"
                  size="sm"
                  isLoading={state.isSaving}
                />
              </View>
            </View>

            <View style={styles.addAccountCard}>
              <Text style={styles.addTitle}>Add Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.accountTagsWrap}>
                  {chartOfAccountsData
                    .filter(account => account.type === 'revenue' || account.type === 'expense')
                    .map(account => (
                      <TouchableOpacity
                        key={account.id}
                        style={styles.accountTag}
                        onPress={() => dispatch(addBudgetLineByAccount({ accountId: account.id }))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.accountTagText}>{account.code}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>
            </View>

            {budget.lines.map(line => (
              <View key={line.id} style={styles.lineCard}>
                <View style={styles.lineHead}>
                  <Text style={styles.lineName}>{line.accountCode} - {line.accountName}</Text>
                  <Text style={styles.lineTotal}>{formatCurrency(line.total, 'Rs ')}</Text>
                </View>

                <View style={styles.distributeRow}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Annual amount"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textLight}
                    onSubmitEditing={e => {
                      const amount = Number(e.nativeEvent.text || 0);
                      dispatch(distributeBudgetLineEvenly({ lineId: line.id, annualAmount: amount }));
                    }}
                  />
                  <CustomButton
                    title="Distribute Evenly"
                    onPress={() =>
                      dispatch(distributeBudgetLineEvenly({ lineId: line.id, annualAmount: line.total }))
                    }
                    variant="secondary"
                    size="sm"
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.monthHeader}>
                      {months.map(month => (
                        <Text key={month} style={styles.monthTitle}>{month.toUpperCase()}</Text>
                      ))}
                    </View>
                    <View style={styles.monthInputsRow}>
                      {months.map(month => (
                        <TextInput
                          key={`${line.id}_${month}`}
                          style={styles.monthInput}
                          value={String(line.monthly[month])}
                          keyboardType="decimal-pad"
                          onChangeText={text => {
                            const value = Number(text || 0);
                            dispatch(setBudgetLineMonthAmount({ lineId: line.id, month, value }));
                          }}
                        />
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            ))}
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
  metaCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  metaText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  actionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addAccountCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  addTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  accountTagsWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  accountTag: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accountTagText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  lineCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  lineHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineName: {
    flex: 1,
    marginRight: spacing.sm,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  lineTotal: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  distributeRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountInput: {
    width: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    backgroundColor: '#F8FAFC',
  },
  monthHeader: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthTitle: {
    width: 78,
    textAlign: 'center',
    fontSize: 10,
    color: '#475569',
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  monthInputsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthInput: {
    width: 78,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default BudgetFormScreen;
