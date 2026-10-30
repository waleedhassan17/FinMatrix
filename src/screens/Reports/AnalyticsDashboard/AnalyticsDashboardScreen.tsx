// ═══════════════════════════════════════════════════════
// FinMatrix — Analytics (the owner's business overview)
// ═══════════════════════════════════════════════════════
// Read top to bottom the way an owner asks — the website's page, stacked for
// a phone: four headline figures with their trends and moves, what stands
// out, the months behind them, where the money went, then cash, the cash
// cycle and customers, and last the balance-sheet health a lender asks about.
//
// One request (/reports/analytics, five expense accounts and five customers
// named before Other); every figure, verdict and sentence is the server's,
// and the comparison period is the server's choice. Each card opens the
// report it comes from, for the same period. The screen is mounted in both
// the Reports and the Dashboard stacks; every report it can open is
// registered in both (navigations-maps/Dashboard).

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { CATEGORY_PALETTE } from '../../../theme/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchOwnerCockpit,
  refreshCockpitRange,
  selectAnalyticsDashboardState,
  setCockpitRange,
} from './analyticsDashboardSlice';
import { KPI_TARGET, type OwnerCockpit } from '../../../models/ownerCockpitModel';
import { insightTarget, type BusinessInsight } from '../../../models/insightModel';
import {
  HEALTH_KPI_KEYS,
  STATUS_CAPTION,
  findKpi,
  formatKpiChange,
  formatKpiValue,
  type Kpi,
  type KpiWithChange,
} from '../../../models/kpiModel';
import { canDonut, OTHER_KEY, type SlicePoint } from '../../../models/chartSlicesModel';
import { SALES_PERIODS, matchSalesPeriod, salesPeriodRange } from '../../../models/reportModel';
import {
  ReportContainer,
  ReportHeader,
  Card,
  EmptyBlock,
  ErrorBlock,
  ErrorBanner,
  KpiCard,
  KpiCardGrid,
  RefreshFade,
  ReportSkeleton,
  parenNegative,
} from '../../../components/reports/ReportUI';
import AssessmentPill from '../../../components/reports/AssessmentPill';
import KpiCards from '../shared/KpiCards';
import KpiInfoSheet from '../shared/KpiInfoSheet';
import PeriodSheet, { rangeText } from '../shared/PeriodSheet';
import RankedBars from '../shared/RankedBars';
import DonutChart from '../shared/DonutChart';
import InsightsList from '../shared/InsightsList';
import CashCycle from '../shared/CashCycle';
import { CashBalanceChart, ProfitChart } from '../shared/MonthCharts';

const { colors, radius, spacing, typography } = THEME;

type AnyNav = NativeStackNavigationProp<Record<string, object | undefined>>;

const rs = (n: number) => parenNegative(n, 'Rs ');

/** A card with a title, what it covers, and the report it opens. */
const Panel: React.FC<{
  title: string;
  subtitle?: string;
  onOpen?: () => void;
  openLabel?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, onOpen, openLabel = 'Open report', children }) => (
  <View style={styles.panel}>
    <View style={styles.panelHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.panelSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onOpen ? (
        <TouchableOpacity
          onPress={onOpen}
          style={styles.open}
          accessibilityRole="button"
          accessibilityLabel={`${openLabel}: ${title}`}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.openText}>{openLabel}</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
    {children}
  </View>
);

const AnalyticsDashboardScreen: React.FC = () => {
  const navigation = useNavigation<AnyNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAnalyticsDashboardState);
  const [refreshing, setRefreshing] = useState(false);
  const [info, setInfo] = useState<Kpi | null>(null);

  useFocusEffect(
    useCallback(() => {
      dispatch(refreshCockpitRange());
    }, [dispatch]),
  );

  const { startDate, endDate } = state.range;
  useEffect(() => {
    dispatch(fetchOwnerCockpit({ startDate, endDate }));
  }, [dispatch, startDate, endDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchOwnerCockpit(state.range));
    setRefreshing(false);
  }, [dispatch, state.range]);

  const d: OwnerCockpit | null = state.data;
  const range = d?.range ?? state.range;
  const retry = () => dispatch(fetchOwnerCockpit(state.range));

  /** A report, for the period on screen. */
  const open = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      switch (screen) {
        case 'ProfitLoss':
        case 'CashFlow':
          navigation.navigate(screen, params ?? { range });
          break;
        case 'BalanceSheet':
          navigation.navigate(screen, params ?? { asOfDate: range.endDate });
          break;
        case 'InventoryValuation':
          navigation.navigate(screen, params ?? { tab: 'health' });
          break;
        default:
          navigation.navigate(screen, params);
      }
    },
    [navigation, range],
  );
  /**
   * Whether this tier mounts a screen. A budget lives only on tiers that have
   * budgets, and stock only on tiers with inventory: an insight or a panel
   * that points elsewhere offers no link rather than one that does nothing.
   */
  const canNavigate = (screen: string) => !!navigation.getState()?.routeNames?.includes(screen as never);
  const insightOpenable = (i: BusinessInsight) => {
    const target = insightTarget(i.report, range);
    return target !== null && canNavigate(target.screen);
  };
  const openInsight = (i: BusinessInsight) => {
    const target = insightTarget(i.report, range);
    if (target && canNavigate(target.screen)) open(target.screen, target.params);
  };

  const kpi = (key: string): KpiWithChange | undefined => (d ? findKpi(d.kpis, key) : undefined);
  const margin = (key: string, label: string): string | null => {
    const m = kpi(key);
    if (!m || m.value === null) return null;
    const move = m.change ? ` · ${formatKpiChange(m.change, 'percent')}` : '';
    return `${formatKpiValue(m.value, 'percent')} ${label}${move}`;
  };
  const runway = kpi('runwayMonths');
  const runwayText = runway
    ? runway.value !== null
      ? `${formatKpiValue(runway.value, 'months')} of runway`
      : STATUS_CAPTION[runway.status]
    : null;
  const series = d?.series ?? [];

  const expenseSlices: SlicePoint[] = (d?.expenseByAccount ?? []).map(e => ({
    key: e.accountCode || OTHER_KEY,
    label: e.accountCode ? e.accountName : 'Other accounts',
    value: e.amount,
    sharePct: e.sharePct,
  }));
  const sales = d?.salesByCustomer ?? null;
  const health = d?.health ?? null;
  const healthKpis = health ? HEALTH_KPI_KEYS.map(k => findKpi(health.kpis, k)).filter((k): k is Kpi => !!k) : [];

  const hero: { key: string; label?: string; trend: (number | null)[]; context?: string | null; assessment?: Kpi['assessment'] }[] = [
    { key: 'revenue', trend: series.map(p => p.revenue), context: null },
    { key: 'grossProfit', trend: series.map(p => p.grossProfit), context: margin('grossMarginPct', 'gross margin') },
    { key: 'netIncome', trend: series.map(p => p.netIncome), context: margin('netMarginPct', 'net margin') },
    {
      key: 'endingCash',
      label: 'Cash and bank',
      trend: series.map(p => p.endingCash),
      context: runwayText,
      // How long the cash lasts says more than whether there is any.
      assessment: runway?.assessment ?? kpi('endingCash')?.assessment ?? null,
    },
  ];

  return (
    <ReportContainer>
      <ReportHeader title="Analytics" subtitle="How the business is doing" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <PeriodSheet
          label="Period"
          value={state.range}
          options={SALES_PERIODS}
          rangeFor={key => salesPeriodRange(key)}
          match={r => matchSalesPeriod(r)}
          onChange={r => dispatch(setCockpitRange(r))}
        />
        {d?.comparisonRange ? <Text style={styles.compare}>Compared with {rangeText(d.comparisonRange)}</Text> : null}

        {state.isLoading && !d ? (
          <>
            <ReportSkeleton variant="kpis" rows={2} />
            <ReportSkeleton variant="statement" />
          </>
        ) : null}
        {state.notFound && !d ? (
          <Card>
            <EmptyBlock icon="activity" title="Analytics is not available" hint="This server predates the business overview." />
          </Card>
        ) : null}
        {!!state.error && !d && !state.notFound ? <ErrorBlock message={state.error} onRetry={retry} /> : null}
        {!!state.error && d ? <ErrorBanner message={state.error} onRetry={retry} /> : null}

        {d ? (
          <RefreshFade busy={state.isLoading}>
            {/* ── The four headline figures ─────────────────────────── */}
            <KpiCardGrid>
              {hero.map(h => {
                const k = kpi(h.key);
                if (!k) return null;
                return (
                  <KpiCard
                    key={h.key}
                    kpi={h.label ? { ...k, label: h.label } : k}
                    hero
                    trend={h.trend}
                    context={h.context}
                    assessment={h.assessment}
                    onInfo={() => setInfo(k)}
                    onPress={() => open(KPI_TARGET[h.key] ?? 'ProfitLoss')}
                  />
                );
              })}
            </KpiCardGrid>

            {/* ── What stands out ───────────────────────────────────── */}
            {d.insights.length > 0 ? (
              <Panel
                title="What stands out"
                subtitle={d.comparisonRange ? `${rangeText(range)}, against ${rangeText(d.comparisonRange)}` : rangeText(range)}
              >
                <InsightsList insights={d.insights} onOpen={openInsight} canOpen={insightOpenable} />
              </Panel>
            ) : null}

            {/* ── The months ────────────────────────────────────────── */}
            <Panel
              title="Revenue and profit by month"
              subtitle="Revenue and gross profit as columns, net profit as the line"
              onOpen={() => open('ProfitLoss')}
              openLabel="Profit & Loss"
            >
              <ProfitChart
                months={series.map(p => ({
                  key: p.period,
                  label: p.label,
                  revenue: p.revenue,
                  grossProfit: p.grossProfit,
                  netIncome: p.netIncome,
                }))}
              />
            </Panel>

            {/* ── Where the money went ──────────────────────────────── */}
            <Panel
              title="Where the money went"
              subtitle="Operating expenses by account — the five largest, then the rest"
              onOpen={() => open('ProfitLoss')}
              openLabel="Profit & Loss"
            >
              {canDonut(expenseSlices) ? (
                <DonutChart
                  title="Operating expenses by account"
                  slices={expenseSlices}
                  palette={CATEGORY_PALETTE}
                  total={kpi('operatingExpenses')?.value ?? undefined}
                  centerLabel="Operating expenses"
                  labelHeader="Account"
                />
              ) : (
                <>
                  <RankedBars
                    points={expenseSlices.map(s => ({ key: s.key, label: s.label, value: s.value }))}
                    limit={Math.max(1, expenseSlices.length)}
                    format={rs}
                    emptyLabel="No operating expenses in this period."
                  />
                  {kpi('operatingExpenses') ? (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalText}>Operating expenses</Text>
                      <Text style={styles.totalText}>{rs(kpi('operatingExpenses')!.value ?? 0)}</Text>
                    </View>
                  ) : null}
                  {expenseSlices.some(s => s.value < 0) ? (
                    <Text style={styles.note}>
                      An account ran a credit this period, so the accounts are shown as bars rather than shares of a whole.
                    </Text>
                  ) : null}
                </>
              )}
            </Panel>

            {/* ── Cash ──────────────────────────────────────────────── */}
            <Panel title="Cash" subtitle="Cash and bank at each month end" onOpen={() => open('CashFlow')} openLabel="Cash Flow">
              <CashBalanceChart months={series.map(p => ({ key: p.period, label: p.label, endingCash: p.endingCash }))} height={110} />
              {(['operatingCashFlow', 'runwayMonths'] as const).map(key => {
                const k = kpi(key);
                if (!k) return null;
                const shown = k.value === null ? STATUS_CAPTION[k.status] : formatKpiValue(k.value, k.unit);
                return (
                  <View key={key} style={styles.fact} accessible accessibilityLabel={`${k.label}, ${shown}`}>
                    <Text style={styles.factLabel}>{k.label}</Text>
                    <View style={styles.factRow}>
                      <Text style={styles.factValue}>{shown}</Text>
                      <AssessmentPill assessment={k.assessment} />
                    </View>
                  </View>
                );
              })}
            </Panel>

            {/* ── The cash cycle ────────────────────────────────────── */}
            <Panel
              title="Cash cycle"
              subtitle={`Days cash is tied up, as of ${dayjs(range.endDate).format('D MMM YYYY')}`}
              onOpen={() => open('ARAging')}
              openLabel="AR Aging"
            >
              <CashCycle kpis={{ dso: kpi('dso'), dio: kpi('dio'), dpo: kpi('dpo'), ccc: kpi('ccc') }} />
            </Panel>

            {/* ── Customers ─────────────────────────────────────────── */}
            {sales ? (
              <Panel title="Customers" subtitle={`Top five by sales · ${sales.label}`} onOpen={() => open('ARAging')} openLabel="AR Aging">
                {sales.top5SharePct !== null ? (
                  <View style={styles.factRow}>
                    <Text style={styles.concentration}>The top five hold {sales.top5SharePct.toFixed(1)}% of sales</Text>
                    <AssessmentPill assessment={sales.assessment} />
                  </View>
                ) : null}
                <RankedBars
                  points={[
                    ...sales.customers.map(c => ({
                      key: c.customerId || c.name,
                      label: c.name,
                      value: c.amount,
                      hint: [
                        c.sharePct !== null ? `${c.sharePct.toFixed(1)}% of sales` : null,
                        c.invoices ? `${c.invoices} invoice${c.invoices === 1 ? '' : 's'}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    })),
                    ...(sales.other.count > 0
                      ? [{ key: '__rest__', label: `Other customers (${sales.other.count})`, value: sales.other.amount }]
                      : []),
                  ]}
                  limit={6}
                  format={rs}
                  emptyLabel="No invoiced sales in this period."
                />
              </Panel>
            ) : null}

            {/* ── Balance-sheet health ──────────────────────────────── */}
            {healthKpis.length > 0 ? (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Business health</Text>
                  <TouchableOpacity
                    onPress={() => open('BalanceSheet')}
                    accessibilityRole="button"
                    accessibilityLabel="Open the Balance Sheet"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.openText}>Balance Sheet ›</Text>
                  </TouchableOpacity>
                </View>
                <KpiCards state={{ status: 'succeeded', error: '' }} kpis={healthKpis} onRetry={retry} onOpen={() => open('BalanceSheet')} />
              </>
            ) : null}

            {/* ── Budget ────────────────────────────────────────────── */}
            {d.budgetVsActual ? (
              <Panel
                title="Budget against actual"
                subtitle={`${d.budgetVsActual.budget.name} · calendar year ${d.budgetVsActual.budget.fiscalYear}`}
                onOpen={
                  canNavigate('BudgetDetail')
                    ? () => navigation.navigate('BudgetDetail', { budgetId: d.budgetVsActual!.budget.id })
                    : undefined
                }
                openLabel="Budget"
              >
                <RankedBars
                  points={d.budgetVsActual.rows.map(r => ({
                    key: r.accountId || r.accountCode,
                    label: `${r.accountCode} ${r.accountName}`,
                    value: r.actual,
                    hint: `of ${rs(r.budgeted)} budgeted · ${r.percentUsed.toFixed(1)}% used`,
                  }))}
                  limit={Math.max(1, d.budgetVsActual.rows.length)}
                  format={rs}
                  emptyLabel="The budget has no lines."
                />
              </Panel>
            ) : null}

            <Text style={styles.footnote}>
              Ledger figures by the statements’ own rules, as of {dayjs(range.endDate).format('D MMM YYYY')}. Sales by customer are on
              the invoice basis.
            </Text>
          </RefreshFade>
        ) : null}
      </ScrollView>
      <KpiInfoSheet kpi={info} onClose={() => setInfo(null)} />
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxxl },
  compare: { ...typography.caption, color: colors.textTertiary, marginTop: -spacing.xxs },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  panelTitle: { ...typography.h5, color: colors.textPrimary },
  panelSub: { ...typography.caption, color: colors.textTertiary },
  open: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  openText: { ...typography.labelSm, color: colors.primary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  totalText: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  note: { ...typography.caption, color: colors.textTertiary },
  fact: { paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight, gap: 2 },
  factLabel: { ...typography.caption, color: colors.textTertiary },
  factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  factValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 1 },
  concentration: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  sectionTitle: { ...typography.h5, color: colors.textPrimary },
  footnote: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },
});

export default AnalyticsDashboardScreen;
