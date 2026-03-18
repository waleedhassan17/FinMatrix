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
import { fetchCashFlowReport, selectCashFlowState, setCashFlowRange } from './cashFlowSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const CashFlowScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectCashFlowState);

  useEffect(() => {
    dispatch(fetchCashFlowReport(state.range));
  }, [dispatch, state.range.startDate, state.range.endDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cash Flow</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterCard}>
          <Text style={styles.label}>Date Range (YYYY-MM-DD)</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={state.range.startDate}
              onChangeText={text => dispatch(setCashFlowRange({ ...state.range, startDate: text }))}
              placeholder="Start"
              placeholderTextColor={colors.textLight}
            />
            <TextInput
              style={styles.input}
              value={state.range.endDate}
              onChangeText={text => dispatch(setCashFlowRange({ ...state.range, endDate: text }))}
              placeholder="End"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {state.report && (
          <>
            <Group title="Operating Activities" lines={state.report.operating} total={state.report.operatingTotal} />
            <Group title="Investing Activities" lines={state.report.investing} total={state.report.investingTotal} />
            <Group title="Financing Activities" lines={state.report.financing} total={state.report.financingTotal} />

            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Net Cash Flow</Text>
              <Text style={styles.netValue}>{formatCurrency(state.report.netCashFlow, 'Rs ')}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Group: React.FC<{
  title: string;
  lines: Array<{ id: string; label: string; amount: number }>;
  total: number;
}> = ({ title, lines, total }) => (
  <View style={styles.groupCard}>
    <Text style={styles.groupTitle}>{title}</Text>
    {lines.length === 0 && <Text style={styles.empty}>No cash movements in range.</Text>}
    {lines.map(line => (
      <View key={line.id} style={styles.lineRow}>
        <Text style={styles.lineLabel}>{line.label}</Text>
        <Text style={styles.lineAmount}>{formatCurrency(line.amount, 'Rs ')}</Text>
      </View>
    ))}
    <View style={styles.hr} />
    <View style={styles.lineRow}>
      <Text style={styles.totalLabel}>Total</Text>
      <Text style={styles.totalValue}>{formatCurrency(total, 'Rs ')}</Text>
    </View>
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
    backgroundColor: '#F8FAFC',
    fontFamily: THEME.typography.fontFamily,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  lineLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineAmount: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  hr: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    fontFamily: THEME.typography.fontFamily,
  },
  netCard: {
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  netLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontFamily: THEME.typography.fontFamily,
  },
  netValue: {
    marginTop: spacing.xs,
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default CashFlowScreen;
