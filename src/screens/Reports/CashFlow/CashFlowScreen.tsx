import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchCashFlowReport, selectCashFlowState, setCashFlowRange } from './cashFlowSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { CashFlowSection } from '../../../models/cashFlowModel';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  DateField,
  SummaryLine,
  LoadingBlock,
  ErrorBlock,
  ACCENT,
  reportContentStyle,
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

const Section: React.FC<{ title: string; section: CashFlowSection }> = ({ title, section }) => (
  <SectionCard title={title} icon="activity">
    {section.lines.length === 0 && <Text style={styles.noneText}>No activity in this period.</Text>}
    {section.lines.map((l, i) => (
      <View key={`${l.label}-${i}`} style={styles.row}>
        <Text style={styles.lineLabel}>{l.label}</Text>
        <Text style={[styles.lineVal, l.amount < 0 && styles.negative]}>{rs(l.amount)}</Text>
      </View>
    ))}
    <View style={styles.subtotalRow}>
      <Text style={styles.subtotalLabel}>Net cash from {title.toLowerCase()}</Text>
      <Text style={[styles.subtotalVal, section.total < 0 && styles.negative]}>{rs(section.total)}</Text>
    </View>
  </SectionCard>
);

const CashFlowScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectCashFlowState);

  useEffect(() => {
    dispatch(fetchCashFlowReport(state.range));
  }, [dispatch, state.range.startDate, state.range.endDate]);

  const report = state.report;
  const positive = (report?.netChange ?? 0) >= 0;

  return (
    <ReportContainer>
      <ReportHeader title="Cash Flow" subtitle="Operating · Investing · Financing" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.filterRow}>
            <DateField
              label="From"
              value={state.range.startDate}
              onChangeText={text => dispatch(setCashFlowRange({ ...state.range, startDate: text }))}
            />
            <DateField
              label="To"
              value={state.range.endDate}
              onChangeText={text => dispatch(setCashFlowRange({ ...state.range, endDate: text }))}
            />
          </View>
        </Card>

        {state.isLoading && <LoadingBlock label="Calculating cash flow…" />}
        {!!state.error && <ErrorBlock message={state.error} onRetry={() => dispatch(fetchCashFlowReport(state.range))} />}

        {report && !state.isLoading && (
          <>
            <KpiGrid
              items={[
                { label: 'Beginning Cash', value: rs(report.beginningCash), accent: ACCENT.teal, icon: 'circle' },
                { label: 'Net Change', value: rs(report.netChange), accent: positive ? ACCENT.green : ACCENT.red, icon: positive ? 'trending-up' : 'trending-down' },
                { label: 'Ending Cash', value: rs(report.endingCash), accent: ACCENT.blue, icon: 'dollar-sign' },
              ]}
            />

            <Section title="Operating" section={report.operating} />
            <Section title="Investing" section={report.investing} />
            <Section title="Financing" section={report.financing} />

            <SectionCard title="Net Change in Cash" icon="repeat">
              <SummaryLine label="Beginning cash" value={rs(report.beginningCash)} />
              <SummaryLine label="Net change" value={rs(report.netChange)} valueColor={positive ? THEME.colors.success : THEME.colors.danger} />
              <View style={styles.endWrap}>
                <SummaryLine label="Ending cash" value={rs(report.endingCash)} strong highlight />
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderLight,
  },
  lineLabel: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, flex: 1 },
  lineVal: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  negative: { color: THEME.colors.danger },
  noneText: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, fontStyle: 'italic' },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  subtotalLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, fontWeight: '700' },
  subtotalVal: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '800' },
  endWrap: { marginTop: 4 },
});

export default CashFlowScreen;
