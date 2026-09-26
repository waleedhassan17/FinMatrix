// ═══════════════════════════════════════════════════════
// FinMatrix — Item explorer
// ═══════════════════════════════════════════════════════
// Reached by tapping an item in Inventory Valuation. One item, every figure it
// has, month by month — the phone's half of the web's explorer, built as one
// chart card the way a dashboard reads:
//
//   · the window: 6M / 12M / 24M / YTD chips, or any two dates in a sheet;
//   · the four headline figures ARE the chart's tabs — tap one and the chart
//     draws it — with the other six metrics in one short row;
//   · tap a month for the documents behind it, in a sheet over the screen;
//   · then the metric month by month, where the stock stands today, who buys
//     it, and anything worth knowing about the figures.
//
// Sales and stock come from two endpoints over the same window and are joined
// by month; each fails on its own, so an older server or one failed request
// leaves the other half working.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  RefreshFade,
  Segmented,
  SummaryLine,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  reportContentStyle,
} from '../../../components/reports/ReportUI';
import MetricChart, { type ChartType } from '../shared/MetricChart';
import MetricTiles from '../shared/MetricTiles';
import { ChartTypeToggle, MetricChips } from '../shared/ExplorerControls';
import ItemSalesEntriesList from '../shared/ItemSalesEntriesList';
import BottomSheet from '../shared/BottomSheet';
import PeriodSheet, { rangeText } from '../shared/PeriodSheet';
import RankedBars from '../shared/RankedBars';
import {
  EXPLORER_METRICS,
  buildExplorerMonths,
  changeTone,
  daysOfCover,
  daysSince,
  defaultMetric,
  explorerMetric,
  formatChange,
  formatMetric,
  metricChange,
  monthOnMonth,
  summarizeMetric,
  type ExplorerMetricKey,
} from '../../../models/itemExplorerModel';
import {
  TREND_WINDOWS,
  matchTrendWindow,
  monthsSpanned,
  priorWindow,
  toIsoDate,
  trendWindowRange,
  type ReportDateRange,
  type TrendWindowKey,
} from '../../../models/reportModel';
import type { ItemSalesEntry } from '../../../models/inventoryValuationModel';
import {
  clearItemSalesEntries,
  fetchInventoryItemHistory,
  fetchItemPerformance,
  fetchItemSalesEntries,
  fetchPriorPerformance,
  resetInventoryItemReport,
  selectInventoryItemReportState,
} from './inventoryItemReportSlice';

const { colors, spacing, typography, radius } = THEME;

type Nav = NativeStackNavigationProp<ReportsStackParamList>;
type ItemRoute = RouteProp<ReportsStackParamList, 'InventoryItemReport'>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/** The figures that choose the chart — the four a reader asks about first. */
const HEADLINE: ExplorerMetricKey[] = ['revenue', 'grossProfit', 'marginPct', 'unitsSold'];
/** Everything else, in one short row. */
const MORE: ExplorerMetricKey[] = EXPLORER_METRICS.map(m => m.key).filter(k => !HEADLINE.includes(k));

/** The window choices, named in full for the sheet. */
const WINDOW_OPTIONS: { key: TrendWindowKey; label: string }[] = [
  { key: 'last6m', label: '6 months' },
  { key: 'last12m', label: '12 months' },
  { key: 'last24m', label: '24 months' },
  { key: 'ytd', label: 'Year to date' },
];

/** One month, clipped to the window — the first and last may be partial. */
const monthRange = (period: string, window: ReportDateRange): ReportDateRange => {
  const first = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const last = toIsoDate(new Date(y, m, 0));
  return {
    startDate: first < window.startDate ? window.startDate : first,
    endDate: last > window.endDate ? window.endDate : last,
  };
};

const unitWord = (uom: string, qty: number) => (uom === 'unit' && qty !== 1 ? 'units' : uom);

const InventoryItemReportScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<ItemRoute>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryItemReportState);

  const [range, setRange] = useState<ReportDateRange>(
    () => params.range ?? trendWindowRange('last12m'),
  );
  const [metricChoice, setMetricChoice] = useState<ExplorerMetricKey | null>(null);
  const [chart, setChart] = useState<ChartType>('bar');
  const [selected, setSelected] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const prior = useMemo(() => priorWindow(range), [range]);

  const load = useCallback(() => {
    // Three requests, three fates: sales, the window before (only for the
    // changes under each figure) and stock.
    dispatch(fetchItemPerformance({ itemId: params.itemId, range }));
    dispatch(fetchPriorPerformance({ itemId: params.itemId, range: prior }));
    dispatch(fetchInventoryItemHistory({ itemId: params.itemId, range }));
  }, [dispatch, params.itemId, range, prior]);

  useEffect(() => {
    load();
  }, [load]);

  // The slice is shared across items: leaving clears it, so the next item
  // never shows this one's chart for a frame.
  useEffect(
    () => () => {
      dispatch(resetInventoryItemReport());
    },
    [dispatch],
  );

  const perf = state.performance;
  const history = state.history;
  const months = useMemo(() => buildExplorerMonths(perf, history), [perf, history]);
  const empty = useMemo(
    () => EXPLORER_METRICS.filter(m => months.every(mo => mo.values[m.key] === null)).map(m => m.key),
    [months],
  );
  const metric: ExplorerMetricKey =
    metricChoice && !empty.includes(metricChoice) ? metricChoice : defaultMetric(months);
  const def = explorerMetric(metric);
  const summary = summarizeMetric(months, metric);
  const selectedIndex = months.findIndex(m => m.period === selected);
  const selectedMonth = selectedIndex >= 0 ? months[selectedIndex] : null;

  // Opening a month loads its documents into a sheet; closing it drops them.
  const selectMonth = (period: string | null) => {
    setSelected(period);
    if (period) {
      dispatch(fetchItemSalesEntries({ itemId: params.itemId, range: monthRange(period, range), page: 1 }));
    } else {
      dispatch(clearItemSalesEntries());
    }
  };
  const changeRange = (next: ReportDateRange) => {
    if (next.startDate > next.endDate) return;
    setSelected(null);
    dispatch(clearItemSalesEntries());
    setRange(next);
  };

  /**
   * Open the document behind a line. InvoiceDetail and CreditMemoDetail live
   * in TransactionsStack and this screen in ReportsStack, so the hop goes
   * through the tab navigator; `initial: false` keeps the Transactions list
   * underneath, the same as the aging reports.
   */
  const openEntry = (e: ItemSalesEntry) => {
    if (!e.docId) return;
    selectMonth(null);
    const screen = e.docType === 'credit_memo' ? 'CreditMemoDetail' : 'InvoiceDetail';
    const param = e.docType === 'credit_memo' ? { creditMemoId: e.docId } : { invoiceId: e.docId };
    (navigation as unknown as NativeStackNavigationProp<Record<string, object>>).navigate(
      'TransactionsStack',
      { screen, params: param, initial: false },
    );
  };

  // ── The figure tiles, each against the window before ────────────────────
  const t = perf?.totals;
  const p = state.prior?.totals;
  const priorWords = range.startDate.endsWith('-01')
    ? `prior ${monthsSpanned(range)} month${monthsSpanned(range) === 1 ? '' : 's'}`
    : 'prior period';
  const priorEmpty = !!p && p.revenue === 0 && p.unitsSold === 0;
  const caption = (
    key: ExplorerMetricKey,
    current: number | null,
    before: number | null | undefined,
  ): React.ReactNode => {
    if (current === null) return 'No sales in this window';
    if (before === undefined) return undefined;
    // Nothing sold before: "+Rs 82K" against it says nothing. Said once.
    if (priorEmpty) return key === 'revenue' ? `No sales in the ${priorWords}` : ' ';
    const change = metricChange(key, current, before);
    const text = formatChange(key, change);
    if (!text) return before === null ? ' ' : `Unchanged on the ${priorWords}`;
    const tone = changeTone(key, change);
    return (
      <Text>
        <Text style={tone === 'good' ? styles.good : tone === 'bad' ? styles.bad : undefined}>
          {tone === 'good' ? '▲ ' : tone === 'bad' ? '▼ ' : ''}
          {text}
        </Text>{' '}
        vs {priorWords}
      </Text>
    );
  };
  const tiles = HEADLINE.map(key => {
    const current = t ? (key === 'marginPct' ? t.marginPct : t[key as 'revenue' | 'grossProfit' | 'unitsSold']) : null;
    const before = p === undefined ? undefined : key === 'marginPct' ? p.marginPct : p[key as 'revenue' | 'grossProfit' | 'unitsSold'];
    return {
      key,
      label: explorerMetric(key).label,
      value: formatMetric(key, current),
      danger: current !== null && current < 0,
      caption: t ? caption(key, current, before) : 'Not available',
    };
  });

  // ── Stock position ──────────────────────────────────────────────────────
  const facts = perf?.item ?? null;
  const onHand =
    facts?.qtyOnHand ?? [...months].reverse().find(m => m.values.closingQty !== null)?.values.closingQty ?? null;
  const cover = facts && t ? daysOfCover(facts.qtyOnHand, t.unitsSold, range) : null;
  const sinceSold = daysSince(facts?.lastSoldDate ?? null);
  const belowReorder = !!facts && facts.reorderPoint > 0 && facts.qtyOnHand <= facts.reorderPoint;
  const listMargin =
    facts && facts.sellingPrice > 0 ? ((facts.sellingPrice - facts.unitCost) / facts.sellingPrice) * 100 : null;

  const notes: string[] = [];
  if (perf && perf.estimatedCogsShare > 0) {
    notes.push(
      `${Math.round(perf.estimatedCogsShare * 100)}% of the cost of sales was split across items sharing an invoice; each invoice's total is exact.`,
    );
  }
  if (perf?.points.some(pt => !pt.costKnown)) {
    notes.push('Some sales carry no recorded cost, so their margin reads high.');
  }
  if (history?.coverage.message) notes.push(history.coverage.message);

  // ── The readout: the tapped month, or the window ────────────────────────
  const readoutValue = selectedMonth ? selectedMonth.values[metric] : summary.value;
  const readoutChange = selectedMonth ? monthOnMonth(months, metric, selectedIndex) : null;
  const readoutChangeText = formatChange(metric, readoutChange);
  const readoutTone = changeTone(metric, readoutChange);

  const windowKey = matchTrendWindow(range);
  const windowIndex = windowKey ? TREND_WINDOWS.findIndex(w => w.key === windowKey) : -1;

  const firstLoad =
    (state.perfStatus === 'loading' || state.perfStatus === 'idle') &&
    (state.historyStatus === 'loading' || state.historyStatus === 'idle') &&
    !perf &&
    !history;
  const bothFailed = state.perfStatus === 'failed' && state.historyStatus === 'failed';
  const busy = state.perfStatus === 'loading' || state.historyStatus === 'loading';

  const title = perf?.itemName || history?.itemName || params.itemName || 'Item';
  const sku = perf?.sku || history?.sku || '';
  const monthLong = selectedMonth ? dayjs(`${selectedMonth.period}-01`).format('MMMM YYYY') : '';

  return (
    <ReportContainer>
      <ReportHeader
        title={title}
        subtitle={
          [
            sku,
            facts?.category,
            onHand !== null && facts ? `${formatMetric('closingQty', onHand)} ${unitWord(facts.unitOfMeasure, onHand)} on hand` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Item explorer'
        }
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {state.notFound ? (
          <Card>
            <EmptyBlock
              icon="alert-circle"
              title="This item could not be found"
              hint="It may have been deleted, or it belongs to another company."
            />
          </Card>
        ) : (
          <>
            {/* The window: four chips, and any two dates one tap away. */}
            <View>
              <Segmented
                options={TREND_WINDOWS.map(w => w.label)}
                activeIndex={windowIndex}
                onChange={i => changeRange(trendWindowRange(TREND_WINDOWS[i].key))}
              />
              <View style={styles.windowRow}>
                <Text style={styles.windowNote} numberOfLines={1}>
                  {rangeText(range)}
                </Text>
                <TouchableOpacity
                  onPress={() => setCustomOpen(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>{windowKey ? 'Custom dates' : 'Custom · change'}</Text>
                </TouchableOpacity>
              </View>
              <PeriodSheet
                sheetOnly
                open={customOpen}
                onOpenChange={setCustomOpen}
                label="Window"
                value={range}
                options={WINDOW_OPTIONS}
                rangeFor={key => trendWindowRange(key)}
                match={r => matchTrendWindow(r)}
                onChange={changeRange}
              />
            </View>

            {firstLoad && <LoadingBlock label="Loading item…" />}
            {bothFailed && <ErrorBlock message={state.error || 'This item could not be loaded'} onRetry={load} />}

            {!firstLoad && !bothFailed && (
              <RefreshFade busy={busy}>
                {/* One chart card: the figures choose what it draws. */}
                <Card padded={false} style={styles.chartCard}>
                  <MetricTiles
                    items={tiles}
                    selected={HEADLINE.includes(metric) ? metric : null}
                    onSelect={setMetricChoice}
                  />
                  <View style={styles.chartBody}>
                    <View style={styles.chartHead}>
                      <View style={styles.chartTitleBox}>
                        <Text style={styles.chartTitle}>{def.label} by month</Text>
                        <Text style={styles.chartSub} numberOfLines={2}>
                          {def.description}
                        </Text>
                      </View>
                      <ChartTypeToggle value={chart} onChange={setChart} />
                    </View>

                    <MetricChips metrics={MORE} value={metric} onChange={setMetricChoice} disabled={empty} />

                    <View style={styles.readout}>
                      <Text style={styles.readoutLabel}>
                        {selectedMonth
                          ? selectedMonth.label
                          : def.kind === 'flow'
                            ? 'Window total'
                            : def.kind === 'level'
                              ? 'Latest'
                              : 'Over the window'}
                      </Text>
                      <Text style={[styles.readoutValue, readoutValue !== null && readoutValue < 0 && styles.bad]}>
                        {formatMetric(metric, readoutValue)}
                      </Text>
                      {selectedMonth && readoutChangeText && selectedIndex > 0 ? (
                        <Text style={styles.readoutChange}>
                          <Text
                            style={readoutTone === 'good' ? styles.good : readoutTone === 'bad' ? styles.bad : undefined}
                          >
                            {readoutChangeText}
                          </Text>{' '}
                          on {months[selectedIndex - 1].label}
                        </Text>
                      ) : null}
                    </View>

                    {summary.readings === 0 ? (
                      <Text style={styles.muted}>Nothing recorded for {def.label.toLowerCase()} in this window.</Text>
                    ) : (
                      <MetricChart
                        metric={metric}
                        type={chart}
                        points={months.map(m => ({ period: m.period, label: m.label, value: m.values[metric] }))}
                        selected={selected}
                        onSelect={selectMonth}
                        average={summary.readings > 1 && def.kind !== 'ratio' ? summary.average : null}
                      />
                    )}

                    <View style={styles.hintRow}>
                      <Feather name="mouse-pointer" size={12} color={colors.primary} />
                      <Text style={styles.hint}>
                        Tap a month for its documents
                        {summary.average !== null && summary.readings > 1 && def.kind !== 'ratio'
                          ? ` · dashed line: average ${formatMetric(metric, summary.average)}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                </Card>

                <SectionCard title={`${def.label} by month`} subtitle="Newest first · tap a month" icon="list">
                  {[...months].reverse().map((m, ri) => {
                    const i = months.length - 1 - ri;
                    const v = m.values[metric];
                    const change = monthOnMonth(months, metric, i);
                    const text = formatChange(metric, change);
                    const tone = changeTone(metric, change);
                    return (
                      <TouchableOpacity
                        key={m.period}
                        style={[styles.monthRow, ri > 0 && styles.monthRule]}
                        activeOpacity={0.6}
                        onPress={() => selectMonth(m.period)}
                        accessibilityRole="button"
                        accessibilityLabel={`${m.label}: ${formatMetric(metric, v)}. Show its documents`}
                      >
                        <Text style={styles.monthLabel}>{m.label}</Text>
                        <Text style={[styles.monthChange, tone === 'good' && styles.good, tone === 'bad' && styles.bad]}>
                          {text ?? ''}
                        </Text>
                        <Text style={[styles.monthValue, v !== null && v < 0 && styles.bad, v === null && styles.mutedValue]}>
                          {formatMetric(metric, v)}
                        </Text>
                        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </SectionCard>

                <SectionCard
                  title="Stock position"
                  subtitle="As of today, at weighted-average cost"
                  icon="package"
                  right={
                    belowReorder ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Below reorder point</Text>
                      </View>
                    ) : undefined
                  }
                >
                  <SummaryLine
                    label="On hand"
                    value={
                      onHand === null
                        ? '—'
                        : `${formatMetric('closingQty', onHand)}${facts ? ` ${unitWord(facts.unitOfMeasure, onHand)}` : ''}`
                    }
                    strong
                  />
                  {facts && (
                    <>
                      <SummaryLine label="Stock value" value={rs(facts.stockValue)} />
                      <SummaryLine label="Average cost" value={rs(facts.unitCost)} />
                      {facts.sellingPrice > 0 && (
                        <SummaryLine
                          label="Selling price"
                          value={`${rs(facts.sellingPrice)}${
                            listMargin !== null
                              ? listMargin < 0
                                ? ` · ${Math.abs(listMargin).toFixed(1)}% below cost`
                                : ` · ${listMargin.toFixed(1)}% margin`
                              : ''
                          }`}
                          valueColor={listMargin !== null && listMargin < 0 ? colors.danger : undefined}
                        />
                      )}
                      {facts.reorderPoint > 0 && (
                        <SummaryLine label="Reorder point" value={formatMetric('closingQty', facts.reorderPoint)} />
                      )}
                      <SummaryLine
                        label="Days of cover"
                        value={
                          cover === null
                            ? 'No recent sales'
                            : cover === 0
                              ? 'Out of stock'
                              : cover > 365
                                ? 'Over a year'
                                : `${cover} day${cover === 1 ? '' : 's'}`
                        }
                        valueColor={cover !== null && cover > 0 && cover <= 14 ? colors.warning : undefined}
                      />
                      <SummaryLine
                        label="Last sold"
                        value={
                          facts.lastSoldDate
                            ? `${dayjs(facts.lastSoldDate).format('MMM D, YYYY')}${
                                sinceSold !== null ? ` · ${sinceSold === 0 ? 'today' : `${sinceSold}d ago`}` : ''
                              }`
                            : 'Never'
                        }
                      />
                    </>
                  )}
                </SectionCard>

                {perf && (
                  <SectionCard title="Top customers" subtitle="Over this window" icon="users">
                    <RankedBars
                      points={perf.customers.map((c, i) => ({
                        key: c.customerId ?? `none-${i}`,
                        label: c.customerName,
                        value: c.revenue,
                        hint: `${formatMetric('unitsSold', c.unitsSold)} units · GP ${rs(c.grossProfit)}`,
                      }))}
                      format={v => rs(v)}
                      emptyLabel="Nobody bought it in this window."
                    />
                    {perf.otherCustomers.count > 0 && (
                      <Text style={styles.muted}>
                        And {perf.otherCustomers.count} more · {rs(perf.otherCustomers.revenue)}
                      </Text>
                    )}
                  </SectionCard>
                )}

                {notes.length > 0 && (
                  <SectionCard title="Notes" icon="info">
                    {notes.map(n => (
                      <View key={n} style={styles.note}>
                        <Feather name="info" size={13} color={colors.textTertiary} />
                        <Text style={styles.noteText}>{n}</Text>
                      </View>
                    ))}
                  </SectionCard>
                )}
              </RefreshFade>
            )}
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={!!selectedMonth}
        onClose={() => selectMonth(null)}
        title={`${title} · ${monthLong}`}
        subtitle={
          state.entries
            ? `${state.entries.total} document line${state.entries.total === 1 ? '' : 's'} · ${rs(state.entries.totals.revenue)}`
            : 'Invoices, deliveries and returns'
        }
      >
        {selectedMonth ? (
          <ItemSalesEntriesList
            data={state.entries}
            status={state.entriesStatus}
            loadingMore={state.entriesLoadingMore}
            label={selectedMonth.label}
            onOpen={openEntry}
            onRetry={() => selectMonth(selectedMonth.period)}
            onLoadMore={() =>
              dispatch(
                fetchItemSalesEntries({
                  itemId: params.itemId,
                  range: monthRange(selectedMonth.period, range),
                  page: (state.entries?.page ?? 1) + 1,
                }),
              )
            }
          />
        ) : null}
      </BottomSheet>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  windowNote: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  link: { ...typography.labelSm, color: colors.primary },
  good: { color: colors.success },
  bad: { color: colors.danger },
  chartCard: { overflow: 'hidden' },
  chartBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  chartTitleBox: { flex: 1 },
  chartTitle: { ...typography.h5, color: colors.textPrimary },
  chartSub: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  readout: { marginTop: spacing.xxs },
  readoutLabel: { ...typography.labelSm, color: colors.textTertiary },
  readoutValue: { ...typography.h3, color: colors.textPrimary },
  readoutChange: { ...typography.caption, color: colors.textSecondary },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hint: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  muted: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  mutedValue: { color: colors.textTertiary },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  monthRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  monthLabel: { ...typography.bodySm, color: colors.textPrimary, width: 64 },
  monthChange: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  monthValue: { ...typography.labelMd, color: colors.textPrimary },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.warningLight,
  },
  badgeText: { ...typography.overline, color: colors.warning },
  note: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  noteText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});

export default InventoryItemReportScreen;
