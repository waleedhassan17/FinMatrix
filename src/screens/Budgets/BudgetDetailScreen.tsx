import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Alert } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';

// Design-system tokens (see src/theme/theme.ts).
const { typography } = THEME;
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchBudget, selectBudgetState, removeBudget } from './budgetSlice';
import { formatCurrency } from '../../utils/formatters';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, KpiGrid, ProgressBar, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';
import type { ReportsStackParamList } from '../../navigators/stacks/ReportsStack';

type Nav = NativeStackNavigationProp<ReportsStackParamList>;
type Rt = RouteProp<Record<string, { budgetId: string }>, string>;
const rs = (n: number) => formatCurrency(n, 'Rs ');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BudgetDetailScreen: React.FC = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { budgetId } = route.params;
  const dispatch = useAppDispatch();
  const { current: b, vsActual, isLoading, error } = useAppSelector(selectBudgetState);

  useFocusEffect(useCallback(() => { dispatch(fetchBudget(budgetId)); }, [dispatch, budgetId]));

  const doDelete = () => Alert.alert('Delete budget', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await dispatch(removeBudget(budgetId)); navigation.goBack(); } },
  ]);

  if (isLoading && !b) return <ReportContainer><ReportHeader title="Budget" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !b) return <ReportContainer><ReportHeader title="Budget" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={() => dispatch(fetchBudget(budgetId))} /></ReportContainer>;
  if (!b) return <ReportContainer><ReportHeader title="Budget" onBack={() => navigation.goBack()} /></ReportContainer>;

  return (
    <ReportContainer>
      <ReportHeader title={b.name} subtitle={`FY ${b.fiscalYear}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {vsActual && (
          <KpiGrid items={[
            { label: 'Budgeted', value: rs(vsActual.totals.budgeted), accent: ACCENT.blue, icon: 'target' },
            { label: 'Actual', value: rs(vsActual.totals.actual), accent: ACCENT.violet, icon: 'activity' },
            { label: 'Variance', value: rs(vsActual.totals.variance), accent: vsActual.totals.variance >= 0 ? ACCENT.green : ACCENT.red, icon: 'trending-up' },
          ]} />
        )}

        <SectionCard title="Budget vs Actual" subtitle="By account — tap a row for the monthly breakdown" icon="bar-chart-2">
          {(vsActual?.rows ?? []).map(r => {
            const pct = r.budgeted > 0 ? Math.min(1, r.actual / r.budgeted) : 0;
            const over = r.actual > r.budgeted;
            const open = expanded === r.accountId;
            const months: any[] = (r as any).months ?? [];
            return (
              <TouchableOpacity
                key={r.accountId}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => setExpanded(open ? null : r.accountId)}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.acctName}>{r.accountCode} {r.accountName}</Text>
                  <Text style={styles.acctVar}>{r.percentUsed}%</Text>
                </View>
                <Text style={styles.acctMeta}>{rs(r.actual)} of {rs(r.budgeted)} · var {rs(r.variance)}</Text>
                <ProgressBar pct={pct} color={over ? ACCENT.red : ACCENT.green} />
                {open && months.length > 0 && (
                  <View style={styles.monthTable}>
                    <View style={styles.monthHead}>
                      <Text style={[styles.monthCell, styles.monthHeadText]}>Month</Text>
                      <Text style={[styles.monthCellNum, styles.monthHeadText]}>Budget</Text>
                      <Text style={[styles.monthCellNum, styles.monthHeadText]}>Actual</Text>
                      <Text style={[styles.monthCellNum, styles.monthHeadText]}>Var</Text>
                    </View>
                    {months.map(m => (
                      <View key={m.month} style={styles.monthRow}>
                        <Text style={styles.monthCell}>{MONTH_NAMES[m.month - 1]}</Text>
                        <Text style={styles.monthCellNum}>{rs(m.budgeted)}</Text>
                        <Text style={styles.monthCellNum}>{rs(m.actual)}</Text>
                        <Text style={[styles.monthCellNum, { color: m.variance >= 0 ? ACCENT.green : ACCENT.red }]}>{rs(m.variance)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {!vsActual && <Text style={styles.acctMeta}>Comparison unavailable.</Text>}
        </SectionCard>

        <Card><View style={styles.totalRow}><Text style={styles.bold}>Total Budget</Text><Text style={styles.bold}>{rs(b.totalBudget)}</Text></View></Card>

        <CustomButton title="Delete Budget" variant="danger" onPress={doDelete} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  row: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight, gap: 5 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  acctName: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary, flex: 1 },
  acctVar: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, fontWeight: typography.labelLg.fontWeight },
  acctMeta: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monthTable: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.border },
  monthHead: { flexDirection: 'row', paddingVertical: 5 },
  monthHeadText: { fontWeight: '700', textTransform: 'uppercase' },
  monthRow: { flexDirection: 'row', paddingVertical: 3 },
  monthCell: { flex: 1, ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  monthCellNum: { flex: 1.2, textAlign: 'right', ...THEME.typography.labelSm, color: THEME.colors.textPrimary },
  bold: { ...THEME.typography.labelLg,  color: THEME.colors.textPrimary }
});

export default BudgetDetailScreen;
