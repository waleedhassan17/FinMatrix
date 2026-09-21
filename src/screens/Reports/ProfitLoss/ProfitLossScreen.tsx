import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchProfitLossLineEntries,
  fetchProfitLossReport,
  selectProfitLossState,
  setProfitLossComparisonEnabled,
  setProfitLossRange, refreshProfitLossRange,
  toggleProfitLossLine
} from './profitLossSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { PnlLine, ProfitLossReport } from '../../../models/profitLossModel';
import LineEntries from './LineEntries';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  DateField,
  LoadingBlock,
  ErrorBlock,
  ACCENT,
  reportContentStyle,
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


/**
 * Which screen shows the record behind a ledger row, and what it calls its id.
 *
 * Only documents that HAVE a detail screen appear here. A source with no entry
 * — a payment, a delivery leg, an inventory adjustment — leaves the row inert
 * rather than navigating somewhere that cannot show it.
 */
const SOURCE_ROUTES: Record<string, { screen: string; param: string }> = {
  invoice: { screen: 'InvoiceDetail', param: 'invoiceId' },
  invoice_void: { screen: 'InvoiceDetail', param: 'invoiceId' },
  bill: { screen: 'BillDetail', param: 'billId' },
  bill_void: { screen: 'BillDetail', param: 'billId' },
  credit_memo: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  credit_memo_void: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  credit_memo_refund: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  vendor_credit: { screen: 'VendorCreditDetail', param: 'vendorCreditId' },
  vendor_credit_void: { screen: 'VendorCreditDetail', param: 'vendorCreditId' },
  purchase_order: { screen: 'PODetail', param: 'poId' },
  po_receipt: { screen: 'PODetail', param: 'poId' },
  journal_entry: { screen: 'JournalEntryDetail', param: 'entryId' },
};

const ProfitLossScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectProfitLossState);
  const company = useStatementCompany();

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
    dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }));
  }, [dispatch, state.range.startDate, state.range.endDate, state.comparisonEnabled]);

  const report: ProfitLossReport | null = state.report;
  const netPositive = (report?.netIncome ?? 0) >= 0;
  const showPrior = state.comparisonEnabled;

  /**
   * Open or close one account line, fetching its transactions the first time.
   *
   * Once per line per period: the slice keys them by account code and clears
   * the map when the range changes, so reopening a line already loaded is
   * instant and changing the period cannot leave last period's rows behind.
   */
  const openLine = useCallback(
    (accountCode: string) => {
      const willOpen = !state.expanded[accountCode];
      dispatch(toggleProfitLossLine(accountCode));
      // Refetch when there is nothing cached OR the last attempt failed. A
      // failed entry is still truthy, so checking only for presence cached a
      // transient network error for the life of the screen — reopening the row
      // showed the same stale message and never tried again.
      const cached = state.entries[accountCode];
      if (willOpen && (!cached || cached.status === 'failed')) {
        dispatch(fetchProfitLossLineEntries({ accountCode, range: state.range }));
      }
    },
    [dispatch, state.expanded, state.entries, state.range],
  );

  /**
   * Open the record behind a ledger row.
   *
   * The documents live in TransactionsStack and this screen is in
   * ReportsStack, so the hop goes through the tab navigator. `initial: false`
   * on both counts: without it React Navigation initialises Transactions as
   * [InvoiceDetail] with no list underneath, and back falls through to the
   * Dashboard while stranding the detail screen on that tab. Same pattern as
   * VendorDetailScreen's create-bill action.
   */
  const openSource = useCallback(
    (sourceType: string, sourceId: string) => {
      const route = SOURCE_ROUTES[sourceType];
      if (!route || !sourceId) return;
      (navigation as unknown as NativeStackNavigationProp<Record<string, object>>).navigate(
        'TransactionsStack',
        {
          screen: route.screen,
          params: { [route.param]: sourceId },
          initial: false,
        },
      );
    },
    [navigation],
  );

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
      <LineEntries
        state={state.entries[l.accountCode]}
        lineAmount={l.amount}
        onOpenSource={openSource}
        onRetry={() =>
          dispatch(
            fetchProfitLossLineEntries({ accountCode: l.accountCode, range: state.range }),
          )
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

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
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

        {state.isLoading && <LoadingBlock label="Calculating profit & loss…" />}
        {!!state.error && (
          <ErrorBlock
            message={state.error}
            onRetry={() =>
              dispatch(fetchProfitLossReport({ range: state.range, comparisonEnabled: state.comparisonEnabled }))
            }
          />
        )}

        {report && !state.isLoading && (
          <>
            {/* Headline KPIs */}
            <KpiGrid
              items={[
                { label: 'Revenue', value: rs(report.revenue), accent: ACCENT.brand, icon: 'trending-up' },
                { label: 'Gross Profit', value: rs(report.grossProfit), accent: ACCENT.blue, icon: 'bar-chart-2' },
                { label: 'Expenses', value: rs(report.expenses), accent: ACCENT.amber, icon: 'arrow-down-circle' },
                {
                  label: 'Net Income',
                  value: rs(report.netIncome),
                  accent: netPositive ? ACCENT.green : ACCENT.red,
                  icon: 'dollar-sign',
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
          </>
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
