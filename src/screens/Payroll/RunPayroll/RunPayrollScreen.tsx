import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart } from 'react-native-chart-kit';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  PAYROLL_PERIOD_OPTIONS,
  type PayrollWorksheetRow,
} from '../../../models/payrollModel';
import {
  selectRunPayrollState,
  selectPayrollTotals,
  setPayrollStep,
  setPayrollPeriod,
  setPayrollHours,
  loadPayrollWorksheet,
  processPayroll,
  resetRunPayroll,
} from './runPayrollSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { formatCurrency } from '../../../utils/formatters';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const STEP_LABELS = ['1. Period', '2. Worksheet', '3. Review', '4. Processed'];

const RunPayrollScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectRunPayrollState);
  const totals = useAppSelector(selectPayrollTotals);

  const screenWidth = Dimensions.get('window').width;

  const chartData = useMemo(
    () => [
      { name: 'Taxes', amount: totals.taxes, color: '#F59E0B', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'Benefits', amount: totals.benefits, color: '#3B82F6', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'Deductions', amount: totals.deductions, color: '#EF4444', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'Net', amount: totals.net, color: '#10B981', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    ],
    [totals],
  );

  const handleNextFromPeriod = async () => {
    await dispatch(
      loadPayrollWorksheet({ periodStart: state.periodStart, periodEnd: state.periodEnd }),
    );
  };

  const handleProcess = async () => {
    if (state.worksheet.length === 0) {
      Alert.alert('No worksheet', 'Please load worksheet rows before processing payroll.');
      return;
    }

    await dispatch(
      processPayroll({
        periodStart: state.periodStart,
        periodEnd: state.periodEnd,
        payDate: state.payDate,
        worksheet: state.worksheet.map(r => ({ employeeId: r.employeeId, hours: r.hours })),
      }),
    );
  };

  const renderWorksheetRow = (row: PayrollWorksheetRow) => (
    <View key={row.employeeId} style={styles.tableRow}>
      <Text style={[styles.cell, styles.employeeCell]} numberOfLines={2}>{row.employeeName}</Text>
      {row.payType === 'hourly' ? (
        <TextInput
          style={[styles.cell, styles.hoursInput]}
          value={String(row.hours)}
          keyboardType="decimal-pad"
          onChangeText={v => dispatch(setPayrollHours({ employeeId: row.employeeId, hours: Number(v || 0) }))}
        />
      ) : (
        <Text style={[styles.cell, styles.hoursReadonly]}>{row.hours.toFixed(0)}</Text>
      )}
      <Text style={styles.cell}>{formatCurrency(row.gross, 'Rs ')}</Text>
      <Text style={styles.cell}>{formatCurrency(row.taxes, 'Rs ')}</Text>
      <Text style={styles.cell}>{formatCurrency(row.benefits, 'Rs ')}</Text>
      <Text style={styles.cell}>{formatCurrency(row.deductions, 'Rs ')}</Text>
      <Text style={[styles.cell, styles.netCell]}>{formatCurrency(row.net, 'Rs ')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Run Payroll</Text>
        </View>
      </View>

      <View style={styles.stepRow}>
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === state.currentStep;
          const isDone = stepNum < state.currentStep;
          return (
            <View key={label} style={[styles.stepChip, isActive && styles.stepChipActive, isDone && styles.stepChipDone]}>
              <Text style={[styles.stepText, (isActive || isDone) && styles.stepTextActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {state.error ? <Text style={styles.errorText}>{state.error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.currentStep === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 1: Select Payroll Period</Text>
            <CustomDropdown
              label="Payroll Period"
              options={PAYROLL_PERIOD_OPTIONS.map(p => ({ label: p.label, value: p.id }))}
              value={state.selectedPeriodId}
              onChange={v => dispatch(setPayrollPeriod(v))}
            />
            <Text style={styles.periodText}>Start: {state.periodStart}</Text>
            <Text style={styles.periodText}>End: {state.periodEnd}</Text>
            <Text style={styles.periodText}>Pay Date: {state.payDate}</Text>
            <CustomButton
              title="Next: Load Worksheet"
              onPress={handleNextFromPeriod}
              variant="primary"
              size="md"
              fullWidth
              isLoading={state.isLoadingWorksheet}
            />
          </View>
        )}

        {state.currentStep === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 2: Payroll Worksheet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headCell, styles.employeeCell]}>Employee</Text>
                  <Text style={styles.headCell}>Hours</Text>
                  <Text style={styles.headCell}>Gross</Text>
                  <Text style={styles.headCell}>Taxes</Text>
                  <Text style={styles.headCell}>Benefits</Text>
                  <Text style={styles.headCell}>Deductions</Text>
                  <Text style={styles.headCell}>Net</Text>
                </View>
                {state.worksheet.map(renderWorksheetRow)}
              </View>
            </ScrollView>

            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>Total Net:</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.net, 'Rs ')}</Text>
            </View>

            <View style={styles.actionRow}>
              <CustomButton title="Back" onPress={() => dispatch(setPayrollStep(1))} variant="secondary" size="md" />
              <CustomButton title="Next: Review" onPress={() => dispatch(setPayrollStep(3))} variant="primary" size="md" />
            </View>
          </View>
        )}

        {state.currentStep === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 3: Review Totals</Text>
            <View style={styles.summaryGrid}>
              <Stat label="Gross" value={totals.gross} />
              <Stat label="Taxes" value={totals.taxes} />
              <Stat label="Benefits" value={totals.benefits} />
              <Stat label="Deductions" value={totals.deductions} />
              <Stat label="Net" value={totals.net} strong />
            </View>

            <PieChart
              data={chartData}
              width={screenWidth - spacing.lg * 2}
              height={220}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
              chartConfig={{
                color: () => colors.textPrimary,
                labelColor: () => colors.textSecondary,
              }}
            />

            <View style={styles.actionRow}>
              <CustomButton title="Back" onPress={() => dispatch(setPayrollStep(2))} variant="secondary" size="md" />
              <CustomButton
                title="Confirm & Process"
                onPress={handleProcess}
                variant="primary"
                size="md"
                isLoading={state.isProcessing}
              />
            </View>
          </View>
        )}

        {state.currentStep === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>STEP 4: Payroll Processed</Text>
            {state.processedRun ? (
              <>
                <Text style={styles.successText}>Payroll run created successfully.</Text>
                <Text style={styles.periodText}>Run ID: {state.processedRun.id}</Text>
                <Text style={styles.periodText}>Journal Entry: {state.processedRun.journalEntryId}</Text>
                <Text style={styles.periodText}>Total Net: {formatCurrency(state.processedRun.totalNet, 'Rs ')}</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            <View style={styles.actionRowWrap}>
              <CustomButton
                title="View Payroll History"
                onPress={() => navigation.navigate('PayrollHistory')}
                variant="primary"
                size="md"
                fullWidth
              />
              <CustomButton
                title="Run Another Payroll"
                onPress={() => dispatch(resetRunPayroll())}
                variant="secondary"
                size="md"
                fullWidth
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, strong && styles.statValueStrong]}>{formatCurrency(value, 'Rs ')}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  stepRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  stepChip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  stepChipActive: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
  },
  stepChipDone: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success,
  },
  stepText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  stepTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  periodText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  headCell: {
    minWidth: 100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    minWidth: 100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  employeeCell: {
    minWidth: 170,
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginVertical: 4,
    paddingVertical: 4,
    textAlign: 'center',
  },
  hoursReadonly: {
    color: colors.textSecondary,
  },
  netCell: {
    fontWeight: '700',
    color: colors.success,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  totalValue: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  actionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionRowWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  statCard: {
    width: '50%',
    padding: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  statValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  statValueStrong: {
    color: colors.success,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default RunPayrollScreen;
