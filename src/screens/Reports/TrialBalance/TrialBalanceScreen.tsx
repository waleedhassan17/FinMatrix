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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchTrialBalanceReport,
  selectTrialBalanceState,
  setTrialBalanceAsOfDate,
} from './trialBalanceSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type TrialBalanceScreenProps = NativeStackScreenProps<ReportsStackParamList, 'TrialBalance'>;

const TrialBalanceScreen: React.FC<TrialBalanceScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTrialBalanceState);
  const rows = Array.isArray(state.report?.rows) ? state.report.rows : [];

  useEffect(() => {
    dispatch(fetchTrialBalanceReport(state.asOfDate));
  }, [dispatch, state.asOfDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Trial Balance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterCard}>
          <Text style={styles.label}>As of Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={state.asOfDate}
            onChangeText={text => dispatch(setTrialBalanceAsOfDate(text))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {state.report && (
          <View style={styles.tableCard}>
            <View style={styles.tableHead}>
              <Text style={[styles.headText, styles.accountCol]}>Account</Text>
              <Text style={styles.headText}>Debit</Text>
              <Text style={styles.headText}>Credit</Text>
            </View>

            {rows.map(row => (
              <View key={row.accountId} style={styles.tableRow}>
                <Text style={[styles.bodyText, styles.accountCol]}>{row.accountCode} - {row.accountName}</Text>
                <Text style={styles.bodyText}>{formatCurrency(row.debit, 'Rs ')}</Text>
                <Text style={styles.bodyText}>{formatCurrency(row.credit, 'Rs ')}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={[styles.totalText, styles.accountCol]}>Totals</Text>
              <Text style={styles.totalText}>{formatCurrency(state.report.totalDebit, 'Rs ')}</Text>
              <Text style={styles.totalText}>{formatCurrency(state.report.totalCredit, 'Rs ')}</Text>
            </View>
          </View>
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
  tableCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: spacing.sm,
  },
  headText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: THEME.typography.fontFamily,
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  bodyText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  accountCol: { flex: 1.6 },
  totalRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#F8FAFC',
  },
  totalText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default TrialBalanceScreen;
