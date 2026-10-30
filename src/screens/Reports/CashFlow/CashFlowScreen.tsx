// ═══════════════════════════════════════════════════════
// FinMatrix — Statement of Cash Flows
// ═══════════════════════════════════════════════════════
// Direct | Indirect. Lines are classified on the server by what the cash was
// FOR — the posting's other side — so capex paid by bill lands in investing
// and a loan in financing. Every line with a key opens the cash postings it
// was built from, with the share of a split payment it took.
//
// Three views, as on the website: the Statement, each Bank account from
// beginning to end, and the Monthly picture — the balance above cash in and
// cash out, two charts on one time axis, never one chart with two scales.
// Above them the runway and the tie the statement must make: ending cash is
// the balance sheet's cash. All of it the server's.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchCashFlowHealth,
  fetchCashFlowReport,
  selectCashFlowState,
  setCashFlowMethod,
  setCashFlowRange,
  refreshCashFlowRange,
} from './cashFlowSlice';
import type { CashFlowLine, CashFlowMethod, CashFlowSection } from '../../../models/cashFlowModel';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  HeaderIconButton,
  Card,
  SectionCard,
  FigureStrip,
  RefreshFade,
  DateField,
  ReportSkeleton,
  ErrorBlock,
  ErrorBanner,
  Segmented,
  ReportTitleBlock,
  StatementRow,
  TieOutBadge,
  useStatementCompany,
  rangeLabel,
  parenNegative,
} from '../../../components/reports/ReportUI';
import { findKpi } from '../../../models/kpiModel';
import KpiCards from '../shared/KpiCards';
import TrendChart from '../shared/TrendChart';
import CashFlowMonthly from './CashFlowMonthly';
import { useShareReportPdf } from '../shared/useShareReportPdf';
import { rangeKey, useAdoptParam } from '../shared/useAdoptParam';
import { cashFlowDoc } from './cashFlowDoc';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => parenNegative(n, 'Rs ');

const METHODS: { key: CashFlowMethod; label: string }[] = [
  { key: 'direct', label: 'Direct' },
  { key: 'indirect', label: 'Indirect' },
];

type View_ = 'statement' | 'accounts' | 'monthly';
const VIEWS: { key: View_; label: string }[] = [
  { key: 'statement', label: 'Statement' },
  { key: 'accounts', label: 'Bank accounts' },
  { key: 'monthly', label: 'Monthly' },
];

/**
 * One activities section, in the order the statement presents it. Lines are
 * rendered as the server sent them and the subtotal is `section.total`.
 */
const Section: React.FC<{
  activity: string;
  section: CashFlowSection;
  onOpen?: (l: CashFlowLine) => void;
}> = ({ activity, section, onOpen }) => (
  <SectionCard title={`Cash Flows from ${activity} Activities`} icon="activity">
    {section.lines.length === 0 && <Text style={styles.noneText}>No activity in this period.</Text>}
    {section.lines.map((l, i) => (
      <StatementRow
        key={`${l.lineKey ?? l.label}-${i}`}
        label={l.label}
        amount={l.amount}
        depth={1}
        onPress={onOpen && l.lineKey ? () => onOpen(l) : undefined}
        pressHint="Opens the cash postings behind this line"
      />
    ))}
    <StatementRow label={`Net cash from ${activity.toLowerCase()} activities`} amount={section.total} bold isTotal />
  </SectionCard>
);

const CashFlowScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'CashFlow'>>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectCashFlowState);
  const company = useStatementCompany();
  const pdf = useShareReportPdf();
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View_>('statement');

  const ready = useAdoptParam(rangeKey(params?.range), rangeKey(state.range)!, () => {
    if (params?.range) dispatch(setCashFlowRange(params.range));
  });

  // Bring the window up to today every time the screen is opened, unless the
  // user chose their own: initialState is evaluated once at bundle startup.
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshCashFlowRange());
    }, [dispatch]),
  );

  const load = useCallback(() => {
    dispatch(fetchCashFlowReport(state.range));
    dispatch(fetchCashFlowHealth(state.range.endDate));
  }, [dispatch, state.range]);

  useEffect(() => {
    if (!ready(rangeKey(state.range)!)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.range.startDate, state.range.endDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchCashFlowReport(state.range)),
      dispatch(fetchCashFlowHealth(state.range.endDate)),
    ]);
    setRefreshing(false);
  }, [dispatch, state.range]);

  const report = state.report;
  const positive = (report?.netChange ?? 0) >= 0;
  const indirect = state.method === 'indirect' && !!report?.operatingIndirect;
  const runway = findKpi(state.health.data?.kpis ?? [], 'runwayMonths');

  const openLine = (l: CashFlowLine) => {
    if (!l.lineKey) return;
    navigation.navigate('CashFlowLine', { lineKey: l.lineKey, label: l.label, ...state.range });
  };

  return (
    <ReportContainer>
      <ReportHeader
        title="Cash Flow"
        subtitle="Operating · Investing · Financing"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            icon="share-2"
            disabled={!report || pdf.busy}
            onPress={() => report && pdf.share(cashFlowDoc(report, state.method))}
            accessibilityLabel="Share the cash flow statement as a PDF"
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} tintColor={THEME.colors.primary} />
        }
      >
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

        {state.isLoading && !report && <ReportSkeleton variant="statement" />}
        {!!state.error && !report && <ErrorBlock message={state.error} onRetry={load} />}
        {!!state.error && report && <ErrorBanner message={state.error} onRetry={load} />}

        {report && (
          <RefreshFade busy={state.isLoading}>
            <FigureStrip
              items={[
                { label: 'Cash at start', value: rs(report.beginningCash), caption: 'In cash and bank accounts' },
                {
                  label: 'Net change',
                  value: rs(report.netChange),
                  tone: positive ? 'default' : 'danger',
                  caption: positive ? 'More came in than went out' : 'More went out than came in',
                },
                { label: 'Cash at end', value: rs(report.endingCash), caption: 'In cash and bank accounts' },
              ]}
            />
            {report.cashTie ? (
              <TieOutBadge
                state={report.cashTie.ties ? 'ties' : 'gap'}
                label={report.cashTie.ties ? 'Ending cash = Balance Sheet cash' : `Balance Sheet cash is ${rs(report.cashTie.balanceSheetCash)}`}
              />
            ) : null}

            {runway || state.health.status === 'loading' ? (
              <KpiCards
                state={state.health}
                kpis={runway ? [runway] : []}
                onRetry={() => dispatch(fetchCashFlowHealth(state.range.endDate))}
                skeletonCount={1}
              />
            ) : null}

            <Segmented
              options={VIEWS.map(v => v.label)}
              activeIndex={VIEWS.findIndex(v => v.key === view)}
              onChange={i => setView(VIEWS[i].key)}
            />

            {view === 'statement' ? (
              <>
                <Segmented
                  options={METHODS.map(m => m.label)}
                  activeIndex={METHODS.findIndex(m => m.key === state.method)}
                  onChange={i => dispatch(setCashFlowMethod(METHODS[i].key))}
                />
                <ReportTitleBlock
                  company={company}
                  report={`Statement of Cash Flows · ${indirect ? 'Indirect' : 'Direct'} method`}
                  periodLabel={rangeLabel(state.range.startDate, state.range.endDate)}
                />

                {indirect && report.operatingIndirect ? (
                  <SectionCard title="Cash Flows from Operating Activities" subtitle="Indirect method" icon="activity">
                    <StatementRow label="Net income" amount={report.operatingIndirect.netIncome} bold />
                    <StatementRow label="Adjustments to reconcile to cash" italic />
                    {report.operatingIndirect.adjustments.map((a, i) => (
                      <StatementRow key={`${a.label}-${i}`} label={a.label} amount={a.amount} depth={1} />
                    ))}
                    <StatementRow label="Net cash from operating activities" amount={report.operatingIndirect.total} bold isTotal />
                    {report.operatingIndirect.excludedNonCash.length > 0 ? (
                      <>
                        <Text style={styles.subhead}>Non-cash items kept out of the walk</Text>
                        {report.operatingIndirect.excludedNonCash.map((a, i) => (
                          <StatementRow key={`x-${a.label}-${i}`} label={a.label} amount={a.amount} depth={1} italic />
                        ))}
                      </>
                    ) : null}
                  </SectionCard>
                ) : (
                  <Section activity="Operating" section={report.operating} onOpen={openLine} />
                )}
                {state.method === 'indirect' && !report.operatingIndirect ? (
                  <Text style={styles.noneText}>The indirect method is not available from this server; showing the direct method.</Text>
                ) : null}
                <Section activity="Investing" section={report.investing} onOpen={openLine} />
                <Section activity="Financing" section={report.financing} onOpen={openLine} />

                <SectionCard title="Cash at End of Period" icon="repeat">
                  <StatementRow label="Net change in cash" amount={report.netChange} bold isTotal />
                  <StatementRow label="Cash at beginning of period" amount={report.beginningCash} />
                  <StatementRow label="Cash at end of period" amount={report.endingCash} isGrand />
                </SectionCard>
              </>
            ) : null}

            {view === 'accounts' ? (
              report.accounts.length > 0 ? (
                <SectionCard title="Cash and Bank Accounts" subtitle="Beginning → ending" icon="credit-card">
                  {report.accounts.map(a => (
                    <StatementRow
                      key={a.accountCode}
                      label={`${a.accountCode}  ${a.accountName}`}
                      amount={a.ending}
                      detail={`from ${rs(a.beginning)}`}
                    />
                  ))}
                  <StatementRow label="Cash at end of period" amount={report.endingCash} isGrand />
                </SectionCard>
              ) : (
                <Text style={styles.noneText}>This server does not list the cash and bank accounts.</Text>
              )
            ) : null}

            {view === 'monthly' ? (
              <Card>
                {report.monthly.length > 0 ? (
                  <CashFlowMonthly months={report.monthly} />
                ) : (
                  // A server that predates cash in and out sends the net only.
                  <TrendChart
                    points={report.monthlyTrend.map((p, i) => ({ key: `${i}-${p.label}`, label: p.label, value: p.value }))}
                    barLabel="Net cash"
                  />
                )}
              </Card>
            ) : null}
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: THEME.spacing.md, gap: THEME.spacing.sm + 2, paddingBottom: THEME.spacing.xxxl },
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  noneText: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, fontStyle: 'italic' },
  subhead: { ...THEME.typography.overline, color: THEME.colors.textTertiary, marginTop: THEME.spacing.sm },
});

export default CashFlowScreen;
