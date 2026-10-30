import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchProfitLossReport,
  selectProfitLossState,
  setProfitLossComparisonEnabled,
  setProfitLossRange, refreshProfitLossRange,
  toggleProfitLossLine
} from './profitLossSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { PnlLine, ProfitLossReport } from '../../../models/profitLossModel';
import { getComparisonRange } from '../../../models/reportModel';
import InlineEntries from '../shared/InlineEntries';
import {
  clearInlineEntries,
  fetchInlineEntries,
  needsInlineFetch,
  selectInlineEntriesMap,
} from '../shared/inlineEntriesSlice';
import { useOpenSource } from '../shared/sourceRoutes';
import { rangeKey, useAdoptParam } from '../shared/useAdoptParam';
import { registerKey } from '../../../models/accountRegisterModel';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  FigureStrip,
  RefreshFade,
  DateField,
  ReportSkeleton,
  ErrorBlock,
  ErrorBanner,
  reportContentStyle,
  formatRatio,
  ReportTitleBlock,
  StatementRow,
  useStatementCompany,
  rangeLabel,
  reconcile
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/**
 * `PnlLine` and `PnlDetail` moved to profitLossModel when the drill-down
 * landed: the slice keys fetched transactions by `accountCode`, so the store
 * and the screen have to agree on the shape. They remain optional there for
 * the same reason as before — a deployment that predates them returns only the
 * scalars, and the statement falls back to group rows when they are absent.
 */
const lines = (v: PnlLine[] | undefined): PnlLine[] => (Array.isArray(v) ? v : []);
const sum = (v: PnlLine[]): number => v.reduce((t, l) => t + (l.amount || 0), 0);


const ProfitLossScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'ProfitLoss'>>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectProfitLossState);
  const drill = useAppSelector(selectInlineEntriesMap);
  const company = useStatementCompany();
  const openSource = useOpenSource();
  const [refreshing, setRefreshing] = useState(false);

  // A period handed in by another report is adopted as the user's own choice.
  const ready = useAdoptParam(rangeKey(params?.range), rangeKey(state.range)!, () => {
    if (params?.range) dispatch(setProfitLossRange(params.range));
  });

  // Bring the window up to today every time the screen is opened.
  //
  // The default is seeded in the slice's initialState, which is evaluated once
  // at bundle startup — so on a device left running for days it silently keeps
  // asking for a window that ended when the app launched, and the report looks
  // like the books stopped. The reducer leaves a range the user chose alone.
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshProfitLossRange());
    }, [dispatch]),
  );

  useEffect(() => {
    if (!ready(rangeKey(state.range)!)) return;
    dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.range.startDate, state.range.endDate, state.comparisonEnabled]);

  const report: ProfitLossReport | null = state.report;
  const netPositive = (report?.netIncome ?? 0) >= 0;
  const showPrior = state.comparisonEnabled;

  /**
   * Open or close one account line, fetching its latest postings the first
   * time. The cache is keyed by account AND period, so reopening a line is
   * instant and a new period can never show the old one's rows.
   */
  const openLine = useCallback(
    (accountCode: string) => {
      const willOpen = !state.expanded[accountCode];
      dispatch(toggleProfitLossLine(accountCode));
      const cached = drill[registerKey(accountCode, state.range.startDate, state.range.endDate)];
      if (willOpen && needsInlineFetch(cached)) {
        dispatch(fetchInlineEntries({ accountCode, ...state.range }));
      }
    },
    [dispatch, state.expanded, drill, state.range],
  );

  const reload = useCallback(
    () => dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled })),
    [dispatch, state.range, state.comparisonEnabled],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(clearInlineEntries());
    await reload();
    setRefreshing(false);
  }, [dispatch, reload]);

  /**
   * One account line, expandable into the transactions behind it.
   *
   * The amount stays exactly what the server sent — expanding reveals what is
   * under a figure, it never recomputes it.
   */
  const accountRow = (l: PnlLine) => (
    <StatementRow
      key={l.accountCode}
      label={`${l.accountCode}  ${l.accountName}`}
      amount={l.amount}
      depth={1}
      expanded={!!state.expanded[l.accountCode]}
      onToggle={() => openLine(l.accountCode)}
    >
      <InlineEntries
        state={drill[registerKey(l.accountCode, state.range.startDate, state.range.endDate)]}
        onOpenSource={openSource}
        onRetry={() => dispatch(fetchInlineEntries({ accountCode: l.accountCode, ...state.range }))}
        onOpenRegister={() =>
          navigation.navigate('AccountRegister', {
            accountCode: l.accountCode,
            title: l.accountName,
            ...state.range,
            // "What changed" reads the same prior period the statement's
            // comparison column does.
            compare: state.comparisonEnabled ? getComparisonRange(state.range) : undefined,
            // A P&L line is the period's movement, not a balance.
            tie: { amount: l.amount, basis: 'movement' },
          })
        }
      />
    </StatementRow>
  );

  // Detail is present only once the backend that returns it is deployed.
  const income = lines(report?.income);
  const cogsLines = lines(report?.cogsLines);
  const expenseLines = lines(report?.expenseLines);
  const otherIncome = lines(report?.otherIncome);
  const otherExpense = lines(report?.otherExpense);
  const hasDetail = income.length + cogsLines.length + expenseLines.length > 0;

  return (
    <ReportContainer>
      <ReportHeader
        title="Profit & Loss"
        subtitle="Income statement"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={reportContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} tintColor={THEME.colors.primary} />
        }
      >
        {/* Filter */}
        <Card>
          <View style={styles.filterRow}>
            <DateField
              label="From"
              value={state.range.startDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, startDate: text }))}
            />
            <DateField
              label="To"
              value={state.range.endDate}
              onChangeText={text => dispatch(setProfitLossRange({ ...state.range, endDate: text }))}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Compare with prior period</Text>
            <Switch
              value={state.comparisonEnabled}
              onValueChange={value => {
                dispatch(setProfitLossComparisonEnabled(value));
              }}
              trackColor={{ false: THEME.colors.neutral200, true: THEME.colors.primary + '66' }}
              thumbColor={state.comparisonEnabled ? THEME.colors.primary : THEME.colors.neutral50}
            />
          </View>
        </Card>

        {state.isLoading && !report && <ReportSkeleton variant="statement" />}
        {/* A failed refresh keeps the last statement on screen under a banner;
            only a first load that fails has nothing to keep. */}
        {!!state.error && !report && <ErrorBlock message={state.error} onRetry={reload} />}
        {!!state.error && report && <ErrorBanner message={state.error} onRetry={reload} />}

        {report && (
          <RefreshFade busy={state.isLoading}>
            {/* Headline KPIs */}
            <FigureStrip
              items={[
                { label: 'Revenue', value: rs(report.revenue), caption: 'Income for the period' },
                {
                  label: 'Gross profit',
                  value: rs(report.grossProfit),
                  caption: `${formatRatio(report.grossProfit, report.revenue)} gross margin`,
                },
                {
                  label: 'Expenses',
                  value: rs(report.expenses),
                  caption: `${formatRatio(report.expenses, report.revenue)} of revenue`,
                },
                {
                  label: 'Net income',
                  value: rs(report.netIncome),
                  tone: netPositive ? 'default' : 'danger',
                  caption: `${formatRatio(report.netIncome, report.revenue)} net margin`,
                },
              ]}
            />

            <ReportTitleBlock
              company={company}
              report="Profit and Loss"
              periodLabel={rangeLabel(state.range.startDate, state.range.endDate)}
            />

            {/*
              Every subtotal below is a scalar the API returned — nothing is
              subtracted or re-summed on the client. `reconcile` compares the
              rendered lines against the server figure and warns a developer in
              dev if they disagree; the server figure is what gets shown.
            */}
            <SectionCard
              title="Statement"
              subtitle={showPrior ? 'Current vs prior period' : undefined}
              icon="file-text"
            >
              {showPrior && (
                <View style={styles.headRow}>
                  <Text style={[styles.colMetric, styles.headText]} />
                  <Text style={[styles.colHead, styles.headText]}>Current</Text>
                  <Text style={[styles.colHead, styles.headText]}>Prior</Text>
                </View>
              )}

              <StatementRow label="Income" bold />
              {/* Gated on THIS section's own lines, as COGS and expenses are.
                  Gating income on `hasDetail` — true if ANY section had detail
                  — rendered the heading followed by nothing for a company with
                  cost lines and no revenue lines. */}
              {income.length > 0 ? (
                income.map(accountRow)
              ) : (
                <StatementRow label="Sales Revenue" amount={report.revenue} depth={1} />
              )}
              <StatementRow
                label="Total Income"
                amount={
                  income.length > 0 && report.totalIncome !== undefined
                    ? reconcile(sum(income), report.totalIncome, 'P&L — income')
                    : report.revenue
                }
                prior={report.comparison?.revenue}
                showPrior={showPrior}
                bold
                isTotal
              />

              <StatementRow label="Cost of Goods Sold" bold />
              {cogsLines.length > 0 ? (
                cogsLines.map(accountRow)
              ) : (
                <StatementRow label="Cost of Goods Sold" amount={report.cogs} depth={1} />
              )}
              <StatementRow
                label="Total Cost of Goods Sold"
                amount={
                  cogsLines.length > 0 && report.totalCogs !== undefined
                    ? reconcile(sum(cogsLines), report.totalCogs, 'P&L — COGS')
                    : report.cogs
                }
                prior={report.comparison?.cogs}
                showPrior={showPrior}
                bold
                isTotal
              />

              <StatementRow
                label="Gross Profit"
                amount={report.grossProfit}
                prior={report.comparison?.grossProfit}
                showPrior={showPrior}
                bold
                isTotal
              />

              <StatementRow label="Expenses" bold />
              {expenseLines.length > 0 ? (
                expenseLines.map(accountRow)
              ) : (
                <StatementRow label="Operating Expenses" amount={report.expenses} depth={1} />
              )}
              <StatementRow
                label="Total Expenses"
                amount={
                  expenseLines.length > 0 && report.totalExpenses !== undefined
                    ? reconcile(sum(expenseLines), report.totalExpenses, 'P&L — expenses')
                    : report.expenses
                }
                prior={report.comparison?.expenses}
                showPrior={showPrior}
                bold
                isTotal
              />

              {/*
                Only rendered when the server supplies the figure. Without the
                operating split, "Net Operating Income" would equal Net Income
                exactly, and deriving it here would mean doing arithmetic the
                server has not sanctioned.
              */}
              {report.netOperatingIncome !== undefined && (
                <StatementRow label="Net Operating Income" amount={report.netOperatingIncome} bold isTotal />
              )}

              {otherIncome.length > 0 && (
                <>
                  <StatementRow label="Other Income" bold />
                  {otherIncome.map(accountRow)}
                </>
              )}
              {otherExpense.length > 0 && (
                <>
                  <StatementRow label="Other Expenses" bold />
                  {otherExpense.map(accountRow)}
                </>
              )}
              {otherIncome.length + otherExpense.length > 0 && report.netOtherIncome !== undefined && (
                <StatementRow label="Net Other Income" amount={report.netOtherIncome} bold isTotal />
              )}

              <StatementRow
                label="Net Income"
                amount={report.netIncome}
                prior={report.comparison?.netIncome}
                showPrior={showPrior}
                isGrand
              />

              {!hasDetail && (
                <Text style={styles.caption}>
                  Shown at group level. Per-account detail appears once the reporting service is updated.
                </Text>
              )}
            </SectionCard>
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  switchRow: {
    marginTop: THEME.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary },

  headRow: {
    gap: THEME.spacing.sm,
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  headText: { ...THEME.typography.labelMd, color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  colMetric: { flex: 1 },
  // Matches the amount gutter StatementRow reserves, so the headings line up.
  colHead: { width: 118, textAlign: 'right' },
  caption: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textTertiary,
    marginTop: THEME.spacing.sm,
    fontStyle: 'italic',
  }
});

export default ProfitLossScreen;
