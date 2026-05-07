import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBalanceSheetReport,
  selectBalanceSheetState,
  setBalanceSheetAsOfDate,
} from './balanceSheetSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const BalanceSheetScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBalanceSheetState);

  useEffect(() => {
    dispatch(fetchBalanceSheetReport(state.asOfDate));
  }, [dispatch, state.asOfDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Balance Sheet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterCard}>
          <Text style={styles.label}>As of Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={state.asOfDate}
            onChangeText={text => dispatch(setBalanceSheetAsOfDate(text))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {state.report && (
          <>
            <Section title="Assets" items={state.report.assets} />
            <Section title="Liabilities" items={state.report.liabilities} />
            <Section title="Equity" items={state.report.equity} />

            <View style={styles.summaryCard}>
              <SummaryRow label="Total Assets" value={state.report.totalAssets} strong />
              <SummaryRow label="Total Liabilities" value={state.report.totalLiabilities} />
              <SummaryRow label="Total Equity" value={state.report.totalEquity} />
              <View style={styles.hr} />
              <SummaryRow
                label="Liabilities + Equity"
                value={state.report.totalLiabilities + state.report.totalEquity}
                strong
              />
              <Text style={[styles.balanceState, state.report.isBalanced ? styles.ok : styles.warn]}>
                {state.report.isBalanced
                  ? 'Assets = Liabilities + Equity'
                  : 'Out of balance'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{
  title: string;
  items?: Array<{ accountId: string; accountCode: string; accountName: string; amount: number }>;
}> = ({ title, items = [] }) => {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {safeItems.map(item => (
        <View key={item.accountId} style={styles.row}>
          <Text style={styles.accountName}>{item.accountCode} - {item.accountName}</Text>
          <Text style={styles.accountValue}>{formatCurrency(item.amount, 'Rs ')}</Text>
        </View>
      ))}
    </View>
  );
};

const SummaryRow: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={[styles.summaryLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.summaryValue, strong && styles.strong]}>{formatCurrency(value, 'Rs ')}</Text>
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
  content: { padding: spacing.md, gap: spacing.md },
  filterCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: '#F8FAFC',
    fontFamily: THEME.typography.fontFamily,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  accountName: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginRight: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  accountValue: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: THEME.typography.fontFamily,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  strong: { fontWeight: '700' },
  hr: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  balanceState: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  ok: { color: colors.success },
  warn: { color: colors.danger },
});

export default BalanceSheetScreen;
