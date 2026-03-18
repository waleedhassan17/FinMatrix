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
import { fetchARAgingReport, selectARAgingState, setARAgingAsOfDate } from './arAgingSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const ARAgingScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectARAgingState);

  useEffect(() => {
    dispatch(fetchARAgingReport(state.asOfDate));
  }, [dispatch, state.asOfDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AR Aging</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterCard}>
          <Text style={styles.label}>As of Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={state.asOfDate}
            onChangeText={text => dispatch(setARAgingAsOfDate(text))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {state.report && (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHead}>
                  <Cell title="Customer" width={180} head />
                  <Cell title="Current" width={120} head />
                  <Cell title="1-30" width={120} head />
                  <Cell title="31-60" width={120} head />
                  <Cell title="61-90" width={120} head />
                  <Cell title="90+" width={120} head />
                  <Cell title="Total" width={140} head />
                </View>

                {state.report.rows.map(row => (
                  <View key={row.customerId} style={styles.tableRow}>
                    <Cell title={row.customerName} width={180} />
                    <Cell title={formatCurrency(row.current, 'Rs ')} width={120} />
                    <Cell title={formatCurrency(row.bucket1to30, 'Rs ')} width={120} />
                    <Cell title={formatCurrency(row.bucket31to60, 'Rs ')} width={120} />
                    <Cell title={formatCurrency(row.bucket61to90, 'Rs ')} width={120} />
                    <Cell title={formatCurrency(row.bucket90Plus, 'Rs ')} width={120} />
                    <Cell title={formatCurrency(row.total, 'Rs ')} width={140} strong />
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Cell title="TOTAL" width={180} strong />
                  <Cell title={formatCurrency(state.report.totals.current, 'Rs ')} width={120} strong />
                  <Cell title={formatCurrency(state.report.totals.bucket1to30, 'Rs ')} width={120} strong />
                  <Cell title={formatCurrency(state.report.totals.bucket31to60, 'Rs ')} width={120} strong />
                  <Cell title={formatCurrency(state.report.totals.bucket61to90, 'Rs ')} width={120} strong />
                  <Cell title={formatCurrency(state.report.totals.bucket90Plus, 'Rs ')} width={120} strong />
                  <Cell title={formatCurrency(state.report.totals.total, 'Rs ')} width={140} strong />
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Cell: React.FC<{ title: string; width: number; head?: boolean; strong?: boolean }> = ({ title, width, head, strong }) => (
  <Text
    style={[
      styles.cell,
      { width },
      head && styles.headText,
      strong && styles.strong,
    ]}
    numberOfLines={1}
  >
    {title}
  </Text>
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
    paddingVertical: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#F8FAFC',
    paddingVertical: spacing.sm,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  headText: {
    fontWeight: '700',
    color: '#334155',
  },
  strong: {
    fontWeight: '700',
  },
});

export default ARAgingScreen;
