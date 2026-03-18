import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPayrollHistory,
  fetchPayrollRunDetail,
  selectPayrollHistoryState,
} from './payrollHistorySlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const toCsvCell = (value: string | number): string => {
  const text = String(value ?? '');
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildPayrollRunCsv = (run: {
  id: string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  totalGross: number;
  totalTaxes: number;
  totalBenefits: number;
  totalDeductions: number;
  totalNet: number;
  worksheet: Array<{
    employeeCode: string;
    employeeName: string;
    department: string;
    hours: number;
    gross: number;
    taxes: number;
    benefits: number;
    deductions: number;
    net: number;
  }>;
}): string => {
  const lines: string[] = [];

  lines.push('Payroll Run Summary');
  lines.push(
    [
      'Run ID',
      'Pay Date',
      'Period Start',
      'Period End',
      'Status',
      'Total Gross',
      'Total Taxes',
      'Total Benefits',
      'Total Deductions',
      'Total Net',
    ]
      .map(toCsvCell)
      .join(','),
  );
  lines.push(
    [
      run.id,
      run.payDate,
      run.payPeriodStart,
      run.payPeriodEnd,
      run.status,
      run.totalGross,
      run.totalTaxes,
      run.totalBenefits,
      run.totalDeductions,
      run.totalNet,
    ]
      .map(toCsvCell)
      .join(','),
  );

  lines.push('');
  lines.push('Payroll Worksheet');
  lines.push(
    [
      'Employee Code',
      'Employee Name',
      'Department',
      'Hours',
      'Gross',
      'Taxes',
      'Benefits',
      'Deductions',
      'Net',
    ]
      .map(toCsvCell)
      .join(','),
  );

  run.worksheet.forEach(row => {
    lines.push(
      [
        row.employeeCode,
        row.employeeName,
        row.department,
        row.hours,
        row.gross,
        row.taxes,
        row.benefits,
        row.deductions,
        row.net,
      ]
        .map(toCsvCell)
        .join(','),
    );
  });

  return lines.join('\n');
};

const PayrollHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { runs, selectedRun, isLoading, isLoadingDetail } = useAppSelector(selectPayrollHistoryState);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchPayrollHistory());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    await dispatch(fetchPayrollHistory());
  }, [dispatch]);

  const handleExportRun = useCallback(
    async (runId: string) => {
      try {
        const detailed = await dispatch(fetchPayrollRunDetail(runId)).unwrap();
        const csv = buildPayrollRunCsv(detailed);

        const safeDate = detailed.payDate.replace(/[^0-9-]/g, '');
        const fileName = `payroll_${detailed.id}_${safeDate || Date.now()}.csv`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Payroll CSV',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('CSV Exported', `CSV file saved to: ${fileUri}`);
        }
      } catch {
        Alert.alert('Export Failed', 'Unable to export payroll CSV. Please try again.');
      }
    },
    [dispatch],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payroll History</Text>
        </View>
        <CustomButton title="Run Payroll" onPress={() => navigation.navigate('RunPayroll')} variant="primary" size="sm" />
      </View>

      {isLoading && runs.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          {runs.map(run => {
            const active = selectedRun?.id === run.id;
            return (
              <View key={run.id} style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => dispatch(fetchPayrollRunDetail(run.id))}
                >
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{formatDate(run.payDate)}</Text>
                      <Text style={styles.cardSub}>{run.payPeriodStart} to {run.payPeriodEnd}</Text>
                    </View>
                    <Text style={styles.status}>{run.status}</Text>
                  </View>

                  <View style={styles.metricsRow}>
                    <Metric label="Employees" value={String(run.employeeCount)} />
                    <Metric label="Gross" value={formatCurrency(run.totalGross, 'Rs ')} />
                    <Metric label="Net" value={formatCurrency(run.totalNet, 'Rs ')} highlight />
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.exportBtn}
                    activeOpacity={0.7}
                    onPress={() => handleExportRun(run.id)}
                  >
                    <Text style={styles.exportBtnText}>Export CSV</Text>
                  </TouchableOpacity>
                </View>

                {active && (
                  <View style={styles.drilldown}>
                    <Text style={styles.drilldownTitle}>Run Drill-down</Text>
                    {isLoadingDetail ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      selectedRun.worksheet.map(row => (
                        <View key={row.employeeId} style={styles.rowLine}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowName}>{row.employeeName}</Text>
                            <Text style={styles.rowSub}>{row.department}</Text>
                          </View>
                          <Text style={styles.rowValue}>{formatCurrency(row.net, 'Rs ')}</Text>
                          <TouchableOpacity
                            style={styles.stubBtn}
                            onPress={() => navigation.navigate('PayStub', { runId: run.id, employeeId: row.employeeId })}
                          >
                            <Text style={styles.stubBtnText}>Stub</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {runs.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No payroll runs found.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Metric: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  status: {
    fontSize: 11,
    color: colors.success,
    backgroundColor: colors.success + '16',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    textTransform: 'capitalize',
    overflow: 'hidden',
    fontFamily: THEME.typography.fontFamily,
  },
  metricsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  metricValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', marginTop: 2, fontFamily: THEME.typography.fontFamily },
  metricValueHighlight: { color: colors.success },
  cardActions: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  exportBtn: {
    backgroundColor: colors.secondary + '14',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  exportBtnText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  drilldown: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  drilldownTitle: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowName: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, fontWeight: '600' },
  rowSub: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  rowValue: { fontSize: 12, color: colors.textPrimary, marginRight: spacing.sm, fontFamily: THEME.typography.fontFamily },
  stubBtn: {
    backgroundColor: colors.primary + '14',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stubBtnText: { fontSize: 11, color: colors.primary, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default PayrollHistoryScreen;
