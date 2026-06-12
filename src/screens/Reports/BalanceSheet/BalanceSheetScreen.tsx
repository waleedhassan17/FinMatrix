import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBalanceSheetReport,
  selectBalanceSheetState,
  setBalanceSheetAsOfDate,
} from './balanceSheetSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  DateField,
  SummaryLine,
  Divider,
  Badge,
  LoadingBlock,
  ErrorBlock,
  ACCENT,
  reportContentStyle,
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

type AcctItem = { accountId: string; accountCode: string; accountName: string; amount: number };

const BalanceSheetScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBalanceSheetState);

  useEffect(() => {
    dispatch(fetchBalanceSheetReport(state.asOfDate));
  }, [dispatch, state.asOfDate]);

  const report = state.report;

  return (
    <ReportContainer>
      <ReportHeader title="Balance Sheet" subtitle="Financial position" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <Card>
          <DateField
            label="As of date"
            value={state.asOfDate}
            onChangeText={text => dispatch(setBalanceSheetAsOfDate(text))}
          />
        </Card>

        {state.isLoading && <LoadingBlock label="Building balance sheet…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchBalanceSheetReport(state.asOfDate))} />
        )}

        {report && !state.isLoading && (
          <>
            <KpiGrid
              items={[
                { label: 'Total Assets', value: rs(report.totalAssets), accent: ACCENT.brand, icon: 'trending-up' },
                { label: 'Total Liabilities', value: rs(report.totalLiabilities), accent: ACCENT.amber, icon: 'credit-card' },
                { label: 'Total Equity', value: rs(report.totalEquity), accent: ACCENT.blue, icon: 'pie-chart' },
              ]}
            />

            <AccountSection title="Assets" icon="trending-up" items={report.assets} />
            <AccountSection title="Liabilities" icon="credit-card" items={report.liabilities} />
            <AccountSection title="Equity" icon="pie-chart" items={report.equity} />

            <SectionCard title="Balance Check" icon="check-circle">
              <SummaryLine label="Total Assets" value={rs(report.totalAssets)} strong />
              <SummaryLine label="Total Liabilities" value={rs(report.totalLiabilities)} />
              <SummaryLine label="Total Equity" value={rs(report.totalEquity)} />
              <Divider />
              <SummaryLine
                label="Liabilities + Equity"
                value={rs(report.totalLiabilities + report.totalEquity)}
                strong
              />
              <View style={styles.balanceBadge}>
                <Badge
                  label={report.isBalanced ? 'Balanced' : 'Out of balance'}
                  color={report.isBalanced ? THEME.colors.success : THEME.colors.danger}
                />
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const AccountSection: React.FC<{ title: string; icon: any; items?: AcctItem[] }> = ({ title, icon, items = [] }) => {
  const safe = Array.isArray(items) ? items : [];
  return (
    <SectionCard title={title} icon={icon}>
      {safe.length === 0 ? (
        <Text style={styles.empty}>No accounts</Text>
      ) : (
        safe.map(item => (
          <View key={item.accountId} style={styles.acctRow}>
            <Text style={styles.acctName} numberOfLines={1}>
              <Text style={styles.acctCode}>{item.accountCode}</Text>  {item.accountName}
            </Text>
            <Text style={styles.acctValue}>{rs(item.amount)}</Text>
          </View>
        ))
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  acctRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  acctName: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, flex: 1, marginRight: 12 },
  acctCode: { color: THEME.colors.textTertiary, fontWeight: '600' },
  acctValue: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  empty: { ...THEME.typography.bodySm, color: THEME.colors.textTertiary, textAlign: 'center', paddingVertical: 8 },
  balanceBadge: { marginTop: 10 },
});

export default BalanceSheetScreen;
