// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation
// ═══════════════════════════════════════════════════════
// What the stock is worth, and which of it earns — the phone's half of the web
// report, laid out so the one thing a reader comes to do is the obvious thing:
// the headline figures, then the items, each of which opens its explorer.
// The rest is a tab away rather than stacked: Insights (who earns, where the
// money sits, how stock has moved) and Tie-out (how the figures reconcile to
// the ledger).
//
// STOCK is as of now (quantity at average cost, which ties to Inventory 1200);
// SALES cover the period chosen at the top.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInventoryPerformance,
  fetchInventoryValuationReport,
  fetchInventoryValuationTrend,
  refreshInventoryPerfRange,
  selectInventoryValuationState,
  setInventoryPerfRange,
  setInventoryRank,
  TREND_MONTHS,
} from './inventoryValuationSlice';
import {
  RANK_OPTIONS,
  STOCK_FILTERS,
  categoryShares,
  filterRows,
  formatShare,
  ledgerTie,
  matchesFilter,
  rankFigure,
  rankRows,
  rowTotals,
  traded,
  unsoldStock,
  valuationRows,
  type StockFilter,
  type ValuationRow,
} from '../../../models/inventoryValuationModel';
import { SALES_PERIODS, matchSalesPeriod, salesPeriodRange } from '../../../models/reportModel';
import MetricChart from '../shared/MetricChart';
import RankedBars from '../shared/RankedBars';
import PeriodSheet from '../shared/PeriodSheet';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  FigureStrip,
  Segmented,
  SummaryLine,
  TCell,
  tableStyles,
  LoadingBlock,
  RefreshFade,
  ErrorBlock,
  EmptyBlock,
  Card,
  reportContentStyle,
} from '../../../components/reports/ReportUI';

const { colors, radius, spacing, typography } = THEME;

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');
const qty = (n: number) =>
  `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
/** Rows drawn before "Show more" — a warehouse can carry hundreds of items. */
const PAGE = 25;
/** Top items: enough to compare, few enough to read at a glance. */
const TOP = 8;
const TABS = ['Items', 'Insights', 'Tie-out'] as const;

const InventoryValuationScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryValuationState);

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [category, setCategory] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [trendMonth, setTrendMonth] = useState<string | null>(null);

  // The sales window follows the calendar unless the user chose one, the same
  // as every other dated report.
  useFocusEffect(
    React.useCallback(() => {
      dispatch(refreshInventoryPerfRange());
    }, [dispatch]),
  );

  useEffect(() => {
    dispatch(fetchInventoryValuationReport());
    // Separate request, separate failure. The trend is context around the
    // snapshot; losing it must not blank the figures the user came for.
    dispatch(fetchInventoryValuationTrend(TREND_MONTHS));
  }, [dispatch]);

  // Keyed on the dates, not the object: a focus re-seeds the same window as
  // a new object, and that must not refetch the whole report.
  const { startDate, endDate } = state.range;
  useEffect(() => {
    dispatch(fetchInventoryPerformance({ range: { startDate, endDate } }));
  }, [dispatch, startDate, endDate]);

  const report = state.report;
  const perf = state.performance;
  const rows = useMemo(() => valuationRows(report, perf), [report, perf]);
  const showSales = (perf?.rows.length ?? 0) > 0;
  const stockValue = perf?.totals.stockValue ?? report?.totalValue ?? 0;
  const tie = ledgerTie(stockValue, perf?.totals.ledgerValue ?? null);
  const unsold = unsoldStock(rows);
  const shares = useMemo(() => categoryShares(rows), [rows]);
  const periodShort = `${dayjs(state.range.startDate).format('MMM D')} – ${dayjs(state.range.endDate).format('MMM D, YYYY')}`;

  const rank = state.rank;
  const ranked = rankRows(rows, rank).slice(0, TOP);
  const rankLabel = RANK_OPTIONS.find(o => o.key === rank)?.label ?? 'Gross profit';
  const rankFormat = (v: number) =>
    rank === 'marginPct' ? `${v.toFixed(1)}%` : rank === 'unitsSold' ? qty(v) : rs(v);
  const rankHint = (r: ValuationRow) => {
    if (rank === 'stockValue') {
      const held = `${qty(r.qty)} on hand`;
      if (!showSales) return held;
      return r.unitsSold > 0 ? `${held} · ${qty(r.unitsSold)} sold` : `${held} · not sold in the period`;
    }
    const sold = `${qty(r.unitsSold)} sold`;
    return r.marginPct === null ? sold : `${sold} · ${r.marginPct.toFixed(1)}% margin`;
  };

  const counts = useMemo(
    () =>
      Object.fromEntries(STOCK_FILTERS.map(f => [f.key, rows.filter(r => matchesFilter(r, f.key)).length])) as Record<
        StockFilter,
        number
      >,
    [rows],
  );
  const filters = STOCK_FILTERS.filter(f => showSales || (f.key !== 'belowCost' && f.key !== 'unsold'));
  const listed = useMemo(
    () =>
      filterRows(rows, { search, category, filter }).sort(
        (a, b) => b.value - a.value || a.itemName.localeCompare(b.itemName),
      ),
    [rows, search, category, filter],
  );
  const listTotals = rowTotals(listed);
  const narrowed = search.trim() !== '' || category !== '' || filter !== 'all';

  const openItem = (itemId: string) => {
    const row = rows.find(r => r.itemId === itemId);
    navigation.navigate('InventoryItemReport', {
      itemId,
      itemName: row?.itemName,
      range: showSales ? state.range : undefined,
    });
  };

  const showItems = (patch: { filter?: StockFilter; category?: string }) => {
    if (patch.filter !== undefined) setFilter(patch.filter);
    if (patch.category !== undefined) setCategory(patch.category);
    setShown(PAGE);
    setTab(0);
  };

  const trendPoints = (state.trend?.points ?? []).map(p => ({ period: p.period, label: p.label, value: p.value }));
  const trendSelected = trendPoints.find(p => p.period === trendMonth) ?? trendPoints[trendPoints.length - 1];

  const figures = [
    {
      label: 'Stock value',
      value: rs(stockValue),
      caption:
        tie && !tie.ties ? (
          <Text style={styles.warn}>Differs from the ledger by {rs(Math.abs(tie.difference))}</Text>
        ) : (
          `${rows.length} items${tie ? ' · matches the ledger' : ''}`
        ),
    },
    {
      label: 'Revenue',
      value: showSales ? rs(perf?.totals.revenue ?? 0) : '—',
      caption: showSales ? `${qty(perf?.totals.unitsSold ?? 0)} units sold` : 'Not available',
    },
    {
      label: 'Gross profit',
      value: showSales ? rs(perf?.totals.grossProfit ?? 0) : '—',
      tone: showSales && (perf?.totals.grossProfit ?? 0) < 0 ? ('danger' as const) : ('default' as const),
      caption: showSales
        ? perf?.totals.marginPct == null
          ? 'No sales in the period'
          : `${perf.totals.marginPct.toFixed(1)}% margin`
        : 'Not available',
    },
    {
      label: 'Unsold stock',
      value: showSales ? rs(unsold.value) : '—',
      caption: showSales
        ? unsold.count === 0
          ? 'Everything in stock sold'
          : `${unsold.count} item${unsold.count === 1 ? '' : 's'} not sold`
        : 'Not available',
    },
  ];

  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, on && styles.chipOn]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ReportContainer>
      <ReportHeader title="Inventory Valuation" subtitle="Stock, and which of it earns" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <PeriodSheet
          label="Sales period"
          value={state.range}
          options={SALES_PERIODS}
          rangeFor={key => salesPeriodRange(key)}
          match={r => matchSalesPeriod(r)}
          onChange={r => {
            setShown(PAGE);
            dispatch(setInventoryPerfRange(r));
          }}
        />

        {/* The spinner is for the first load only. A new period keeps the
            figures on screen, dimmed, until the answer lands. */}
        {state.isLoading && !report && <LoadingBlock label="Valuing inventory…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchInventoryValuationReport())} />
        )}

        {report && (
          <RefreshFade busy={state.isLoading || state.perfStatus === 'loading'}>
            <FigureStrip items={figures} />

            <Segmented options={[...TABS]} activeIndex={tab} onChange={setTab} />

            {/* ── Items: the report, and the way into every item ─────────── */}
            {tab === 0 && (
              <Card>
                <View style={styles.hintRow}>
                  <Feather name="mouse-pointer" size={13} color={colors.primary} />
                  <Text style={styles.hint}>Tap any item to explore its monthly sales, profit and stock.</Text>
                </View>

                <View style={styles.search}>
                  <Feather name="search" size={15} color={colors.textTertiary} />
                  <TextInput
                    value={search}
                    onChangeText={v => {
                      setSearch(v);
                      setShown(PAGE);
                    }}
                    placeholder="Find an item or SKU"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel="Find an item or SKU"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
                      <Feather name="x" size={15} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, styles.gapTop]}>
                  {filters.map(f =>
                    chip(f.key, `${f.label} ${counts[f.key]}`, f.key === filter, () => showItems({ filter: f.key })),
                  )}
                  {category ? chip('category', `${category} ✕`, true, () => showItems({ category: '' })) : null}
                </ScrollView>

                {listed.length === 0 ? (
                  <EmptyBlock
                    icon="search"
                    title="No items match"
                    hint={narrowed ? 'Try another search or filter.' : 'Add items to see valuation.'}
                  />
                ) : (
                  <View style={styles.gapTop}>
                    {listed.slice(0, shown).map((r, i) => {
                      const idle = showSales && r.qty > 0 && r.unitsSold <= 0;
                      const sub = !showSales
                        ? `${qty(r.qty)} on hand`
                        : r.qty <= 0 && !traded(r)
                          ? 'Out of stock'
                          : idle
                            ? r.lastSoldDate
                              ? `Not sold since ${dayjs(r.lastSoldDate).format('MMM D, YYYY')}`
                              : 'Never sold'
                            : `${qty(r.unitsSold)} sold${r.marginPct !== null ? ` · ${r.marginPct.toFixed(1)}%` : ''}`;
                      return (
                        <TouchableOpacity
                          key={r.itemId}
                          style={[styles.itemRow, i > 0 && styles.itemRule]}
                          activeOpacity={0.6}
                          onPress={() => openItem(r.itemId)}
                          accessibilityRole="button"
                          accessibilityLabel={`${r.itemName}, ${rs(r.value)}. Explore`}
                        >
                          <View style={styles.itemMain}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {r.itemName}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {[r.sku, r.category].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <View style={styles.itemFigures}>
                            <Text style={styles.itemValue}>{rs(r.value)}</Text>
                            <Text
                              style={[styles.itemSub, traded(r) && r.grossProfit < 0 && styles.bad]}
                              numberOfLines={1}
                            >
                              {sub}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                      );
                    })}

                    {listed.length > shown && (
                      <TouchableOpacity style={styles.more} onPress={() => setShown(s => s + PAGE)} accessibilityRole="button">
                        <Text style={styles.link}>
                          Show more ({shown} of {listed.length})
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* The rows SHOWING, so a filtered list foots to itself. */}
                    <View style={styles.total}>
                      <Text style={styles.totalLabel}>
                        {narrowed ? `${listed.length} of ${rows.length} items` : `${rows.length} items`}
                      </Text>
                      <View style={styles.itemFigures}>
                        <Text style={styles.totalValue}>{rs(listTotals.value)}</Text>
                        {showSales && (
                          <Text style={[styles.itemSub, listTotals.grossProfit < 0 && styles.bad]}>
                            GP {rs(listTotals.grossProfit)}
                            {listTotals.marginPct !== null ? ` · ${listTotals.marginPct.toFixed(1)}%` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            )}

            {/* ── Insights: who earns, where the money sits, how it moved ── */}
            {tab === 1 && (
              <>
                <SectionCard
                  title={`Top ${TOP} by ${rankLabel.toLowerCase()}`}
                  subtitle={rank === 'stockValue' ? 'As of today' : periodShort}
                  icon="award"
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {RANK_OPTIONS.filter(o => showSales || o.key === 'stockValue').map(o =>
                      chip(o.key, o.label, o.key === rank, () => dispatch(setInventoryRank(o.key))),
                    )}
                  </ScrollView>
                  <View style={styles.gapTop}>
                    <RankedBars
                      points={ranked.map(r => ({
                        key: r.itemId,
                        label: r.itemName,
                        value: rankFigure(r, rank) ?? 0,
                        hint: rankHint(r),
                      }))}
                      limit={TOP}
                      format={rankFormat}
                      onSelect={openItem}
                      navigates
                      emptyLabel={rank === 'stockValue' ? 'Nothing is held in stock.' : 'Nothing sold in this period.'}
                    />
                  </View>
                </SectionCard>

                {shares.length > 0 && (
                  <SectionCard title="Stock value by category" subtitle="As of today · tap one to list its items" icon="layers">
                    <RankedBars
                      points={shares.map(c => ({
                        key: c.category,
                        label: c.category,
                        value: c.value,
                        hint: `${c.items} item${c.items === 1 ? '' : 's'} · ${formatShare(c.share)} of stock`,
                      }))}
                      format={v => rs(v)}
                      onSelect={key => showItems({ category: key })}
                      navigates
                    />
                  </SectionCard>
                )}

                {trendPoints.length > 0 && (
                  <SectionCard title="Stock value over time" subtitle="Inventory account 1200 at each month end" icon="trending-up">
                    {trendSelected && (
                      <View style={styles.readout}>
                        <Text style={styles.readoutLabel}>{trendSelected.label}</Text>
                        <Text style={[styles.readoutValue, (trendSelected.value ?? 0) < 0 && styles.bad]}>
                          {rs(trendSelected.value ?? 0)}
                        </Text>
                      </View>
                    )}
                    <MetricChart
                      metric="closingValue"
                      type="bar"
                      points={trendPoints}
                      selected={trendMonth}
                      onSelect={setTrendMonth}
                    />
                  </SectionCard>
                )}
              </>
            )}

            {/* ── Tie-out: how the figures reconcile, and to what ────────── */}
            {tab === 2 && (
              <>
                <SectionCard title="Stock against the ledger" subtitle="As of today" icon="check-square">
                  {tie ? (
                    <>
                      <SummaryLine label="Stock value (this report)" value={rs(stockValue)} />
                      <SummaryLine label="Inventory account 1200" value={rs(tie.ledgerValue)} />
                      <SummaryLine
                        label="Difference"
                        value={tie.ties ? 'None' : rs(tie.difference)}
                        valueColor={tie.ties ? colors.success : colors.warning}
                        strong
                      />
                      <Text style={styles.note}>
                        {tie.ties
                          ? 'The stock on hand and the balance sheet agree.'
                          : 'Stock at average cost and the Inventory account have drifted apart. The balance sheet reports the account.'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.note}>The ledger comparison is not available from this server.</Text>
                  )}
                </SectionCard>

                {perf && rows.some(traded) && perf.reconciliation.items.length > 0 ? (
                  // Why this report does not equal the Profit & Loss, named
                  // rather than left to be discovered as a discrepancy.
                  <SectionCard title="Sales against the Profit & Loss" subtitle={periodShort} icon="git-merge">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        <View style={tableStyles.head}>
                          <TCell width={200} head>Source</TCell>
                          <TCell width={120} head align="right">Revenue</TCell>
                          <TCell width={120} head align="right">Cost of sales</TCell>
                        </View>
                        <View style={tableStyles.row}>
                          <TCell width={200}>Goods sold (this report)</TCell>
                          <TCell width={120} align="right">{rs(perf.reconciliation.itemRevenue)}</TCell>
                          <TCell width={120} align="right">{rs(perf.reconciliation.itemCogs)}</TCell>
                        </View>
                        {perf.reconciliation.items.map((it, i) => (
                          <View key={it.label} style={[tableStyles.row, i % 2 === 0 && tableStyles.rowAlt]}>
                            <TCell width={200}>{it.label}</TCell>
                            <TCell width={120} align="right">{it.revenue === 0 ? '—' : rs(it.revenue)}</TCell>
                            <TCell width={120} align="right">{it.cogs === 0 ? '—' : rs(it.cogs)}</TCell>
                          </View>
                        ))}
                        <View style={tableStyles.totalRow}>
                          <TCell width={200} strong>Profit &amp; Loss</TCell>
                          <TCell width={120} align="right" strong>{rs(perf.reconciliation.glRevenue)}</TCell>
                          <TCell width={120} align="right" strong>{rs(perf.reconciliation.glCogs)}</TCell>
                        </View>
                      </View>
                    </ScrollView>
                    <Text style={styles.note}>{perf.reconciliation.note}</Text>
                  </SectionCard>
                ) : (
                  <Card>
                    <Text style={styles.note}>Nothing sold in {periodShort}, so there is nothing to tie to the Profit &amp; Loss.</Text>
                  </Card>
                )}

                <SectionCard title="How these figures are built" icon="info">
                  {[
                    'Stock is the quantity on hand at weighted-average cost, as of today.',
                    'Sales are by document date: invoices and approved deliveries, less customer returns. Drafts and voids are left out.',
                    'Revenue is net of tax and of any invoice discount; cost of sales is the cost each sale was posted at.',
                    ...(perf && perf.estimatedCogsShare > 0
                      ? [`${Math.round(perf.estimatedCogsShare * 100)}% of the cost was split across items that shared an invoice; each invoice's total is exact.`]
                      : []),
                  ].map(line => (
                    <View key={line} style={styles.bullet}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{line}</Text>
                    </View>
                  ))}
                </SectionCard>
              </>
            )}
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  warn: { color: colors.warning },
  bad: { color: colors.danger },
  link: { ...typography.labelSm, color: colors.primary },
  gapTop: { marginTop: spacing.sm },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.textInverse },
  readout: { marginBottom: spacing.xs },
  readoutLabel: { ...typography.labelSm, color: colors.textTertiary },
  readoutValue: { ...typography.h4, color: colors.textPrimary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.bodySm, color: colors.textPrimary, flex: 1, paddingVertical: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  itemRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  itemMain: { flex: 1, gap: 2 },
  itemName: { ...typography.labelMd, color: colors.textPrimary },
  itemMeta: { ...typography.caption, color: colors.textTertiary },
  itemFigures: { alignItems: 'flex-end', gap: 2, maxWidth: '50%' },
  itemValue: { ...typography.labelMd, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textSecondary },
  more: { alignItems: 'center', paddingVertical: spacing.sm },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.textPrimary,
  },
  totalLabel: { ...typography.labelSm, color: colors.textPrimary },
  totalValue: { ...typography.labelLg, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  bullet: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  bulletDot: { ...typography.caption, color: colors.textTertiary },
  bulletText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});

export default InventoryValuationScreen;
