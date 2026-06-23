import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchPayrollRun, selectPayrollState, processRun, removeRun } from './payrollSlice';
import { formatCurrency } from '../../utils/formatters';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, KpiGrid, Badge, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Rt = RouteProp<Record<string, { payrollRunId: string }>, string>;
const rs = (n: number) => formatCurrency(n, 'Rs ');
const STATUS_COLOR: Record<string, string> = { draft: THEME.colors.textSecondary, processed: ACCENT.blue, paid: ACCENT.green };

const PayrollRunDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { payrollRunId } = route.params;
  const dispatch = useAppDispatch();
  const { currentRun: r, isLoading, isSaving, error } = useAppSelector(selectPayrollState);

  useFocusEffect(useCallback(() => { dispatch(fetchPayrollRun(payrollRunId)); }, [dispatch, payrollRunId]));

  const process = () => Alert.alert('Process Payroll', 'Post the payroll journal entry and mark as paid?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Process', onPress: async () => {
      const res: any = await dispatch(processRun(payrollRunId));
      if (res.meta.requestStatus === 'fulfilled') Alert.alert('Done', 'Payroll processed and posted.');
      else Alert.alert('Failed', res.error?.message ?? 'Could not process');
    } },
  ]);

  if (isLoading && !r) return <ReportContainer><ReportHeader title="Payroll" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !r) return <ReportContainer><ReportHeader title="Payroll" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={() => dispatch(fetchPayrollRun(payrollRunId))} /></ReportContainer>;
  if (!r) return <ReportContainer><ReportHeader title="Payroll" onBack={() => navigation.goBack()} /></ReportContainer>;

  return (
    <ReportContainer>
      <ReportHeader title={r.payPeriod} subtitle={`Pay date ${r.payDate}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}><Badge label={r.status} color={STATUS_COLOR[r.status] ?? THEME.colors.textSecondary} dot /></View>
        <KpiGrid items={[
          { label: 'Gross', value: rs(r.totalGross), accent: ACCENT.blue, icon: 'briefcase' },
          { label: 'Deductions', value: rs(r.totalDeductions), accent: ACCENT.amber, icon: 'minus-circle' },
          { label: 'Net Pay', value: rs(r.totalNet), accent: ACCENT.green, icon: 'dollar-sign' },
        ]} />

        <SectionCard title="Pay Stubs" icon="users">
          <View style={styles.headRow}>
            <Text style={[styles.colName, styles.headText]}>Employee</Text>
            <Text style={[styles.colVal, styles.headText]}>Gross</Text>
            <Text style={[styles.colVal, styles.headText]}>Ded.</Text>
            <Text style={[styles.colVal, styles.headText]}>Net</Text>
          </View>
          {r.items.map((it, i) => (
            <View key={it.id ?? i} style={styles.bodyRow}>
              <Text style={[styles.colName, styles.bodyText]}>{it.employeeName || 'Employee'}</Text>
              <Text style={[styles.colVal, styles.bodyText]}>{rs(it.gross)}</Text>
              <Text style={[styles.colVal, styles.bodyText]}>{rs(it.deductions)}</Text>
              <Text style={[styles.colVal, styles.bodyText, styles.bold]}>{rs(it.net)}</Text>
            </View>
          ))}
        </SectionCard>

        <View style={styles.actions}>
          {r.status !== 'paid' && <CustomButton title="Process Payroll" variant="primary" onPress={process} isLoading={isSaving} fullWidth />}
          {r.status !== 'paid' && <CustomButton title="Delete" variant="danger" onPress={() => { dispatch(removeRun(payrollRunId)); navigation.goBack(); }} fullWidth />}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  statusRow: { alignItems: 'flex-start' },
  headRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  headText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, textTransform: 'uppercase' },
  bodyRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  bodyText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
  colName: { flex: 1.4 }, colVal: { flex: 1, textAlign: 'right' },
  bold: { fontWeight: '800' },
  actions: { gap: 10 },
});

export default PayrollRunDetailScreen;
