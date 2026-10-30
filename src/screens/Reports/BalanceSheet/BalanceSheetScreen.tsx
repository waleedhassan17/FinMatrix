// ═══════════════════════════════════════════════════════
// FinMatrix — Balance Sheet
// ═══════════════════════════════════════════════════════
// The statement exactly as the server groups and totals it: sections by the
// account's subtype (classifyForStatement), the server's subtotals, the
// server's A = L + E verdict. The phone groups nothing and adds nothing up.
//
// Balance | Compare | % of assets switch what each line says rather than
// adding columns a phone has no width for: Compare puts the prior figure and
// the change on a second line, % of assets shows the common-size figure with
// the amount beneath it. The PDF, which has the width, lays them out as
// columns.
//
// Every account line opens in place to its latest postings and from there to
// its register. Retained Earnings opens how it was built, year by year; the
// current year's earnings open the P&L for the fiscal year to date.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBalanceSheetReport,
  fetchFinancialHealth,
  selectBalanceSheetState,
  setBalanceSheetAsOfDate,
  refreshBalanceSheetAsOfDate,
  setBalanceSheetComparison,
  setBalanceSheetMode,
} from './balanceSheetSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  HeaderIconButton,
  Card,
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
  asOfLabel,
  parenNegative,
} from '../../../components/reports/ReportUI';
import {
  balanceSheetSections,
  formatChangePct,
  formatPct,
  type BalanceSheetMode,
  type BalanceSheetSectionLine,
  type BsRow,
} from '../../../models/balanceSheetModel';
import {
  AS_OF_COMPARE_OPTIONS,
  asOfCompareDate,
  dayAfter,
} from '../../../models/comparisonModel';
import { registerKey } from '../../../models/accountRegisterModel';
import InlineEntries from '../shared/InlineEntries';
import {
  clearInlineEntries,
  fetchInlineEntries,
  needsInlineFetch,
  selectInlineEntriesMap,
} from '../shared/inlineEntriesSlice';
import { useOpenSource } from '../shared/sourceRoutes';
import ComparisonSheet from '../shared/ComparisonSheet';
import KpiCards from '../shared/KpiCards';
import { HEALTH_KPI_KEYS, findKpi } from '../../../models/kpiModel';
import { useShareReportPdf } from '../shared/useShareReportPdf';
import { useAdoptParam } from '../shared/useAdoptParam';
import RetainedEarningsSheet from './RetainedEarningsSheet';
import { balanceSheetDoc } from './balanceSheetDoc';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => parenNegative(n, 'Rs ');

const MODES: { key: BalanceSheetMode; label: string }[] = [
  { key: 'balance', label: 'Balance' },
  { key: 'compare', label: 'Compare' },
  { key: 'common', label: '% of assets' },
];

const BalanceSheetScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'BalanceSheet'>>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectBalanceSheetState);
  const drill = useAppSelector(selectInlineEntriesMap);
  const company = useStatementCompany();
  const openSource = useOpenSource();
  const pdf = useShareReportPdf();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const [reSheet, setReSheet] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const report = state.report;
  const asOf = state.asOfDate;
  const fiscalYearStart = report?.fiscalYearStart ?? null;

  // A date handed in by another report is adopted as the user's own choice.
  const ready = useAdoptParam(params?.asOfDate ?? null, asOf, () => {
    if (params?.asOfDate) dispatch(setBalanceSheetAsOfDate(params.asOfDate));
  });

  // Bring the date up to today every time the screen is opened, unless the
  // user chose one: initialState is evaluated once at bundle startup.
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshBalanceSheetAsOfDate());
    }, [dispatch]),
  );

  // The date Compare reads prior figures at. Only a choice of DATE — the
  // figures for it are the server's.
  const compareTo =
    state.mode === 'compare' ? asOfCompareDate(state.compareKey, asOf, fiscalYearStart, state.customCompare) : null;

  const load = useCallback(() => {
    dispatch(fetchBalanceSheetReport({ asOfDate: asOf, compareTo }));
    dispatch(fetchFinancialHealth(asOf));
  }, [dispatch, asOf, compareTo]);

  useEffect(() => {
    if (!ready(asOf)) return;
    dispatch(fetchBalanceSheetReport({ asOfDate: asOf, compareTo }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, asOf, compareTo]);

  useEffect(() => {
    if (!ready(asOf)) return;
    dispatch(fetchFinancialHealth(asOf));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, asOf]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(clearInlineEntries());
    await Promise.all([
      dispatch(fetchBalanceSheetReport({ asOfDate: asOf, compareTo })),
      dispatch(fetchFinancialHealth(asOf)),
    ]);
    setRefreshing(false);
  }, [dispatch, asOf, compareTo]);

  const sections = useMemo(() => (report ? balanceSheetSections(report) : []), [report]);
  // The register a balance-sheet line opens: from the start of the fiscal
  // year (its opening balance carries everything before), or — comparing —
  // from the day after the comparison date, so the register's opening IS the
  // prior figure and its closing the current one. A server without a fiscal
  // year falls back to the calendar year.
  const registerStart =
    compareTo !== null ? dayAfter(compareTo) : fiscalYearStart ?? `${asOf.slice(0, 4)}-01-01`;

  const comparing = state.mode === 'compare' && compareTo !== null;
  const compareLabel = AS_OF_COMPARE_OPTIONS.find(o => o.key === state.compareKey)?.label ?? 'Compare';

  // Open lines are keyed by the register period too, so a new date or
  // comparison starts with every line closed — nothing needs resetting.
  const openKey = (code: string) => registerKey(code, registerStart, asOf);

  const toggleLine = (line: BalanceSheetSectionLine) => {
    const code = line.accountCode;
    const open = !expanded[openKey(code)];
    setExpanded(e => ({ ...e, [openKey(code)]: open }));
    const arg = { accountCode: code, startDate: registerStart, endDate: asOf };
    if (open && needsInlineFetch(drill[registerKey(code, registerStart, asOf)])) {
      dispatch(fetchInlineEntries(arg));
    }
  };

  const lineLabel = (l: BalanceSheetSectionLine) => (l.accountCode ? `${l.accountCode}  ${l.accountName}` : l.accountName);

  const lineFigures = (l: BalanceSheetSectionLine): { display?: string; detail?: string; tone?: 'default' | 'danger' } => {
    if (state.mode === 'common') return { display: formatPct(l.pctOfTotalAssets), detail: rs(l.amount) };
    if (comparing && l.priorAmount !== null) {
      const pct = formatChangePct(l);
      return { detail: `${rs(l.priorAmount)} prior${pct ? ` · ${pct}` : ''}` };
    }
    return {};
  };

  // A total's second line: its amount under the common-size figure, or the
  // prior figure and the server's change % when comparing.
  const totalDetail = (item: Extract<BsRow, { kind: 'total' }>): string | undefined => {
    if (state.mode === 'common' && item.pct !== null) return rs(item.amount);
    if (!comparing || item.prior === null) return undefined;
    const pct = formatChangePct({ amount: item.amount, priorAmount: item.prior, changePct: item.changePct });
    return `${rs(item.prior)} prior${pct ? ` · ${pct}` : ''}`;
  };

  const renderItem = ({ item }: { item: BsRow }) => {
    if (item.kind === 'groupHeading') return <View style={styles.row}><StatementRow label={item.label} bold /></View>;
    if (item.kind === 'empty') return <Text style={[styles.row, styles.empty]}>{item.label}</Text>;
    if (item.kind === 'total') {
      return (
        <View style={styles.row}>
          <StatementRow
            label={item.label}
            amount={item.amount}
            bold={!item.grand}
            isTotal={!item.grand}
            isGrand={item.grand}
            display={state.mode === 'common' && item.pct !== null ? formatPct(item.pct) : undefined}
            detail={totalDetail(item)}
          />
        </View>
      );
    }
    const l = item.line;
    const f = lineFigures(l);
    const common = {
      label: lineLabel(l),
      amount: l.amount,
      depth: item.depth,
      display: f.display,
      detail: f.detail,
    };

    // Retained Earnings — synthetic, or the 3100 account carrying earlier
    // years' earnings — opens how it was built.
    if (l.synthetic === 'retainedEarnings' || l.composite) {
      return (
        <View style={styles.row}>
          <StatementRow {...common} onPress={() => setReSheet(l.amount)} pressHint="Opens how retained earnings were built" />
        </View>
      );
    }
    // This fiscal year's earnings are the P&L for the year to date.
    if (l.synthetic === 'currentYearEarnings') {
      return (
        <View style={styles.row}>
          <StatementRow
            {...common}
            onPress={() =>
              navigation.navigate('ProfitLoss', {
                range: { startDate: fiscalYearStart ?? `${asOf.slice(0, 4)}-01-01`, endDate: asOf },
              })
            }
            pressHint="Opens the profit and loss for the fiscal year to date"
          />
        </View>
      );
    }
    if (!l.accountCode) {
      return (
        <View style={styles.row}>
          <StatementRow {...common} />
        </View>
      );
    }
    const code = l.accountCode;
    return (
      <View style={styles.row}>
        <StatementRow {...common} expanded={!!expanded[openKey(code)]} onToggle={() => toggleLine(l)}>
          <InlineEntries
            state={drill[registerKey(code, registerStart, asOf)]}
            onOpenSource={openSource}
            onRetry={() => dispatch(fetchInlineEntries({ accountCode: code, startDate: registerStart, endDate: asOf }))}
            onOpenRegister={() =>
              navigation.navigate('AccountRegister', {
                accountCode: code,
                title: l.accountName,
                startDate: registerStart,
                endDate: asOf,
                tie: { amount: l.amount, basis: 'closing' },
              })
            }
          />
        </StatementRow>
      </View>
    );
  };

  const header = (
    <View style={styles.headerBlock}>
      <Card>
        <DateField label="As of date" value={asOf} onChangeText={text => dispatch(setBalanceSheetAsOfDate(text))} />
        <View style={styles.gapTop}>
          <Segmented
            options={MODES.map(m => m.label)}
            activeIndex={MODES.findIndex(m => m.key === state.mode)}
            onChange={i => {
              const mode = MODES[i].key;
              // Compare with nothing chosen starts from the last month end.
              if (mode === 'compare' && state.compareKey === 'none') {
                dispatch(setBalanceSheetComparison({ key: 'priorMonthEnd', customDate: state.customCompare }));
              }
              dispatch(setBalanceSheetMode(mode));
            }}
          />
        </View>
        {state.mode === 'compare' ? (
          <TouchableOpacity
            style={styles.compareRow}
            onPress={() => setCompareOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Compare with ${compareLabel}${compareTo ? `, ${dayjs(compareTo).format('D MMM YYYY')}` : ''}. Change`}
          >
            <Feather name="git-commit" size={14} color={THEME.colors.primary} />
            <Text style={styles.compareText} numberOfLines={1}>
              Compare with {compareLabel}
              {compareTo ? ` · ${dayjs(compareTo).format('D MMM YYYY')}` : ' · pick a date'}
            </Text>
            <Feather name="chevron-right" size={14} color={THEME.colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </Card>

      {state.isLoading && !report ? <ReportSkeleton variant="statement" /> : null}
      {!!state.error && !report ? <ErrorBlock message={state.error} onRetry={load} /> : null}
      {!!state.error && report ? <ErrorBanner message={state.error} onRetry={load} /> : null}

      {report ? (
        <RefreshFade busy={state.isLoading}>
          <FigureStrip
            items={[
              { label: 'Total assets', value: rs(report.totalAssets), caption: 'What the business owns' },
              { label: 'Total liabilities', value: rs(report.totalLiabilities), caption: 'What it owes' },
              {
                label: 'Total equity',
                value: rs(report.totalEquity),
                tone: report.totalEquity < 0 ? 'danger' : 'default',
                caption: "The owners' stake",
              },
            ]}
          />
          <Text style={styles.heading}>Financial health</Text>
          {/* The four a lender asks of a balance sheet, as on the website. The
              days figures live on the aging reports and Analytics. */}
          <KpiCards
            state={state.health}
            kpis={HEALTH_KPI_KEYS.map(k => findKpi(state.health.data?.kpis ?? [], k)).filter(
              (k): k is NonNullable<typeof k> => !!k,
            )}
            onRetry={() => dispatch(fetchFinancialHealth(asOf))}
          />
          <ReportTitleBlock
            company={company}
            report="Balance Sheet"
            periodLabel={comparing ? `${asOfLabel(asOf)} · vs ${dayjs(compareTo!).format('D MMM YYYY')}` : asOfLabel(asOf)}
          />
          <View style={styles.tie}>
            <TieOutBadge
              state={report.isBalanced ? 'balanced' : 'gap'}
              label={report.isBalanced ? 'Balanced — Assets = Liabilities + Equity' : 'Assets ≠ Liabilities + Equity'}
              gap={report.gap}
            />
          </View>
        </RefreshFade>
      ) : null}
    </View>
  );

  return (
    <ReportContainer>
      <ReportHeader
        title="Balance Sheet"
        subtitle="Financial position"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            icon="share-2"
            disabled={!report || pdf.busy}
            onPress={() => report && pdf.share(balanceSheetDoc(report, sections, state.mode, compareTo))}
            accessibilityLabel="Share the balance sheet as a PDF"
          />
        }
      />

      <SectionList
        sections={report ? sections : []}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader} accessibilityRole="header">
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled
        ListHeaderComponent={header}
        ListFooterComponent={<View style={styles.footer} />}
        extraData={[expanded, drill, state.mode, compareTo]}
        initialNumToRender={30}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      />

      <ComparisonSheet
        kind="asOf"
        visible={compareOpen}
        onClose={() => setCompareOpen(false)}
        asOfDate={asOf}
        fiscalYearStart={fiscalYearStart}
        value={state.compareKey}
        customDate={state.customCompare}
        onApply={(key, _date, custom) => dispatch(setBalanceSheetComparison({ key, customDate: custom }))}
      />
      <RetainedEarningsSheet
        visible={reSheet !== null}
        onClose={() => setReSheet(null)}
        asOfDate={asOf}
        lineAmount={reSheet ?? 0}
      />
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: { padding: THEME.spacing.md, paddingBottom: THEME.spacing.xs, gap: THEME.spacing.sm },
  gapTop: { marginTop: THEME.spacing.sm },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
    minHeight: 44,
    marginTop: THEME.spacing.xs,
  },
  compareText: { ...THEME.typography.labelMd, color: THEME.colors.primary, flex: 1 },
  heading: { ...THEME.typography.overline, color: THEME.colors.textTertiary, marginTop: THEME.spacing.xs },
  tie: { alignItems: 'flex-start' },
  sectionHeader: {
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  sectionTitle: { ...THEME.typography.overline, color: THEME.colors.textSecondary },
  row: { backgroundColor: THEME.colors.surface, paddingHorizontal: THEME.spacing.md },
  empty: { ...THEME.typography.bodySm, color: THEME.colors.textTertiary, paddingVertical: THEME.spacing.sm },
  footer: { height: THEME.spacing.xxxl },
});

export default BalanceSheetScreen;
